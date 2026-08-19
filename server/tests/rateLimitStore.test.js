import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  LazyRateLimitStore,
  createRateLimitStore,
  describeRateLimitBacking,
  isRedisStoreAvailable,
  __setRedisStoreForTesting,
} from "../middleware/rateLimitStore.js";

/**
 * Issue #1452 — every limiter in `rateLimiter.js` silently used an in-process
 * MemoryStore, because `createStore()` ran `getRedisClient()` at module scope
 * and `initRedis()` only runs much later, from `startWorkers()`.
 *
 * The regression these tests guard is specifically the *timing*: a store must
 * still reach Redis when the client only becomes ready after the store was
 * constructed. So most of them construct the store with no client at all, then
 * make one appear, and assert the switch happens.
 *
 * No live Redis is needed — `tests/setup.js` deletes `REDIS_URI` — so the fake
 * client below is the whole dependency surface.
 */

/** Minimal stand-in for the `redis` client, with a controllable `isReady`. */
const createFakeClient = ({ isReady = true } = {}) => ({
  isReady,
  sendCommand: vi.fn(async () => 1),
});

/**
 * Stand-in for `rate-limit-redis`'s RedisStore. Records what it was constructed
 * with and counts hits per key, which is enough to prove delegation.
 */
class FakeRedisStore {
  static instances = [];

  constructor(options) {
    this.options = options;
    this.prefix = options.prefix;
    // Deliberately does NOT set `localKeys`, because the real
    // `rate-limit-redis` RedisStore does not either — express-rate-limit reads
    // the resulting `undefined` as "keys are shared". A fake that set
    // `localKeys = false` would hide that.
    this.hits = new Map();
    this.initCalls = [];
    this.shutdownCalls = 0;
    FakeRedisStore.instances.push(this);
  }

  init(options) {
    this.initCalls.push(options);
  }

  async increment(key) {
    const totalHits = (this.hits.get(key) || 0) + 1;
    this.hits.set(key, totalHits);
    return { totalHits, resetTime: undefined };
  }

  async decrement(key) {
    this.hits.set(key, Math.max(0, (this.hits.get(key) || 0) - 1));
  }

  async resetKey(key) {
    this.hits.delete(key);
  }

  async resetAll() {
    this.hits.clear();
  }

  shutdown() {
    this.shutdownCalls += 1;
  }
}

const WINDOW_OPTIONS = { windowMs: 60_000, limit: 5 };

describe("LazyRateLimitStore (#1452)", () => {
  beforeEach(() => {
    FakeRedisStore.instances = [];
    __setRedisStoreForTesting(FakeRedisStore);
  });

  afterEach(() => {
    __setRedisStoreForTesting(null);
    vi.restoreAllMocks();
  });

  describe("the original bug: no client at construction time", () => {
    it("still serves requests when Redis is not available yet", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => null,
      });
      store.init(WINDOW_OPTIONS);

      // MemoryStore hands back a live record it keeps mutating, so the count
      // has to be read at the moment of the call rather than compared later.
      const first = (await store.increment("1.2.3.4")).totalHits;
      const second = (await store.increment("1.2.3.4")).totalHits;

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(store.backing).toBe("memory");
    });

    it("upgrades to Redis on the first call after the client becomes ready", async () => {
      // This is the exact sequence that was broken: the store is built during
      // the import phase, and `initRedis()` only resolves later.
      let client = null;
      const store = new LazyRateLimitStore("rl:login:", {
        getClient: () => client,
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);

      await store.increment("1.2.3.4");
      expect(store.backing).toBe("memory");

      client = createFakeClient();

      await store.increment("1.2.3.4");
      expect(store.backing).toBe("redis");
      expect(FakeRedisStore.instances).toHaveLength(1);
    });

    it("does not upgrade while the client is connecting but not ready", async () => {
      const client = createFakeClient({ isReady: false });
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => client,
      });
      store.init(WINDOW_OPTIONS);

      await store.increment("1.2.3.4");
      expect(store.backing).toBe("memory");

      client.isReady = true;
      await store.increment("1.2.3.4");
      expect(store.backing).toBe("redis");
    });
  });

  describe("wiring the Redis store correctly", () => {
    it("passes this limiter's prefix through", async () => {
      const store = new LazyRateLimitStore("rl:upload:", {
        getClient: () => createFakeClient(),
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);
      await store.increment("1.2.3.4");

      expect(FakeRedisStore.instances[0].options.prefix).toBe("rl:upload:");
    });

    it("replays init() options onto a store created after init", async () => {
      // A RedisStore that never receives init() has no windowMs, sets no TTL,
      // and leaks keys forever.
      let client = null;
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => client,
        log: vi.fn(),
      });

      store.init(WINDOW_OPTIONS);
      client = createFakeClient();
      await store.increment("1.2.3.4");

      expect(FakeRedisStore.instances[0].initCalls).toEqual([WINDOW_OPTIONS]);
    });

    it("forwards init() straight through when it arrives after resolution", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => createFakeClient(),
        log: vi.fn(),
      });

      await store.increment("1.2.3.4");
      store.init(WINDOW_OPTIONS);

      expect(FakeRedisStore.instances[0].initCalls).toContainEqual(
        WINDOW_OPTIONS,
      );
    });

    it("routes commands through the client it was given", async () => {
      const client = createFakeClient();
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => client,
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);
      await store.increment("1.2.3.4");

      FakeRedisStore.instances[0].options.sendCommand("INCR", "k");
      expect(client.sendCommand).toHaveBeenCalledWith("INCR", "k");
    });

    it("shuts the memory store down when it switches to Redis", async () => {
      let client = null;
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => client,
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);

      await store.increment("1.2.3.4");
      const memoryStore = store._backing;
      const shutdownSpy = vi.spyOn(memoryStore, "shutdown");

      client = createFakeClient();
      await store.increment("1.2.3.4");

      // Otherwise the MemoryStore sweep interval keeps running for a store
      // nothing reads any more.
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it("only builds the Redis store once, however many calls follow", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => createFakeClient(),
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);

      for (let i = 0; i < 25; i += 1) await store.increment("1.2.3.4");

      expect(FakeRedisStore.instances).toHaveLength(1);
    });
  });

  describe("delegation", () => {
    it("forwards every Store method to the backing store", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => createFakeClient(),
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);

      await store.increment("1.2.3.4");
      await store.increment("1.2.3.4");
      const backing = FakeRedisStore.instances[0];
      expect(backing.hits.get("1.2.3.4")).toBe(2);

      await store.decrement("1.2.3.4");
      expect(backing.hits.get("1.2.3.4")).toBe(1);

      await store.resetKey("1.2.3.4");
      expect(backing.hits.has("1.2.3.4")).toBe(false);

      await store.increment("5.6.7.8");
      await store.resetAll();
      expect(backing.hits.size).toBe(0);
    });

    it("counts hits per key, not globally", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => null,
      });
      store.init(WINDOW_OPTIONS);

      await store.increment("1.1.1.1");
      await store.increment("1.1.1.1");
      const other = await store.increment("2.2.2.2");

      expect(other.totalHits).toBe(1);
    });

    it("resolves resetAll() without a resetAll on the backing store", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => null,
      });
      store.init(WINDOW_OPTIONS);
      await store.increment("1.2.3.4");
      delete store._backing.resetAll;

      await expect(store.resetAll()).resolves.toBeUndefined();
    });
  });

  describe("failure handling", () => {
    it("stays on memory when the Redis store constructor throws", async () => {
      __setRedisStoreForTesting(
        class Broken {
          constructor() {
            throw new Error("bad connection options");
          }
        },
      );
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => createFakeClient(),
      });
      store.init(WINDOW_OPTIONS);

      const result = await store.increment("1.2.3.4");

      expect(result.totalHits).toBe(1);
      expect(store.backing).toBe("memory");
      expect(warn).toHaveBeenCalled();
    });

    it("stays on memory when resolving the client throws", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => {
          throw new Error("redis service not initialised");
        },
      });
      store.init(WINDOW_OPTIONS);

      await expect(store.increment("1.2.3.4")).resolves.toMatchObject({
        totalHits: 1,
      });
      expect(store.backing).toBe("memory");
    });

    it("stays on memory when rate-limit-redis is not installed", async () => {
      __setRedisStoreForTesting(null);

      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => createFakeClient(),
      });
      store.init(WINDOW_OPTIONS);
      await store.increment("1.2.3.4");

      expect(store.backing).toBe("memory");
      expect(isRedisStoreAvailable()).toBe(false);
    });
  });

  describe("express-rate-limit contract", () => {
    it("exposes a distinct prefix per limiter", () => {
      // `singleCount` keys its per-request bookkeeping by constructor name when
      // localKeys is false. Every limiter shares this class, so the prefix is
      // what keeps two limiters from tripping a spurious ERR_ERL_DOUBLE_COUNT.
      expect(createRateLimitStore("rl:api:").prefix).toBe("rl:api:");
      expect(createRateLimitStore("rl:login:").prefix).toBe("rl:login:");
    });

    it("reports localKeys honestly on both sides of the switch", async () => {
      let client = null;
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => client,
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);

      expect(store.localKeys).toBe(true);

      await store.increment("1.2.3.4");
      expect(store.localKeys).toBe(true);

      client = createFakeClient();
      await store.increment("1.2.3.4");
      expect(store.localKeys).toBe(false);
    });

    it("shuts down the backing store and builds nothing new", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => createFakeClient(),
        log: vi.fn(),
      });
      store.init(WINDOW_OPTIONS);
      await store.increment("1.2.3.4");

      await store.shutdown();

      expect(FakeRedisStore.instances[0].shutdownCalls).toBe(1);
      expect(store.backing).toBe("unresolved");
    });

    it("shuts down cleanly when nothing was ever resolved", async () => {
      const store = new LazyRateLimitStore("rl:test:", {
        getClient: () => null,
      });

      await expect(store.shutdown()).resolves.toBeUndefined();
      expect(FakeRedisStore.instances).toHaveLength(0);
    });

    it("announces the switch to Redis exactly once across all limiters", async () => {
      const log = vi.fn();
      let client = null;
      const stores = ["rl:api:", "rl:login:", "rl:upload:"].map(
        (prefix) =>
          new LazyRateLimitStore(prefix, { getClient: () => client, log }),
      );
      for (const store of stores) store.init(WINDOW_OPTIONS);

      client = createFakeClient();
      for (const store of stores) await store.increment("1.2.3.4");

      expect(stores.every((s) => s.backing === "redis")).toBe(true);
      expect(log).toHaveBeenCalledTimes(1);
    });
  });
});

describe("describeRateLimitBacking (#1452)", () => {
  const originalUri = process.env.REDIS_URI;

  beforeEach(() => {
    __setRedisStoreForTesting(FakeRedisStore);
  });

  afterEach(() => {
    __setRedisStoreForTesting(null);
    if (originalUri === undefined) delete process.env.REDIS_URI;
    else process.env.REDIS_URI = originalUri;
  });

  it("says limiting is per-process when REDIS_URI is unset", () => {
    delete process.env.REDIS_URI;
    const result = describeRateLimitBacking();

    expect(result.redisConfigured).toBe(false);
    expect(result.message).toMatch(/per-process/);
  });

  it("warns when REDIS_URI is set but the store module is missing", () => {
    process.env.REDIS_URI = "redis://localhost:6379";
    __setRedisStoreForTesting(null);

    expect(describeRateLimitBacking().message).toMatch(
      /could not be loaded.*per-process/,
    );
  });

  it("reports the healthy configuration when both are present", () => {
    process.env.REDIS_URI = "redis://localhost:6379";
    const result = describeRateLimitBacking();

    expect(result.redisConfigured).toBe(true);
    expect(result.storeAvailable).toBe(true);
    expect(result.message).toMatch(/attach to Redis/);
  });
});
