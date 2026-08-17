import { createClient } from "redis";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

let redisClient = null;
let isRedisDisabled = false;
let redisUri = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let reconnectInProgress = false;
let shutdownRequested = false;

// Search-cache fallback used when Redis is unavailable. This cache is process-local
// and intentionally bounded by TTL; it is a graceful-degradation mechanism, not
// a replacement for shared Redis in multi-instance deployments.
const memorySearchCache = new Map();
const memoryOrgKeys = new Map();

const pruneExpiredMemoryCache = () => {
  const now = Date.now();

  for (const [key, entry] of memorySearchCache) {
    if (entry.expiresAt <= now) {
      memorySearchCache.delete(key);
      memoryOrgKeys.forEach((keys, organizationId) => {
        keys.delete(key);
        if (keys.size === 0) memoryOrgKeys.delete(organizationId);
      });
    }
  }
};

const setMemorySearchCache = (
  cacheKey,
  organizationId,
  payload,
  softTTLSec,
  hardTTLSec,
) => {
  const expiresAt = Date.now() + hardTTLSec * 1000;
  const orgId = organizationId || "global";

  memorySearchCache.set(cacheKey, {
    payload,
    cachedAt: Date.now(),
    softTTL: softTTLSec,
    hardTTL: hardTTLSec,
    expiresAt,
    organizationId: orgId,
  });

  if (!memoryOrgKeys.has(orgId)) {
    memoryOrgKeys.set(orgId, new Set());
  }

  memoryOrgKeys.get(orgId).add(cacheKey);
};

const clearMemoryOrgCache = (organizationId = "global") => {
  pruneExpiredMemoryCache();

  const orgId = organizationId || "global";
  const keys = memoryOrgKeys.get(orgId);

  if (!keys) return 0;

  let deletedCount = 0;

  for (const key of keys) {
    if (memorySearchCache.delete(key)) {
      deletedCount += 1;
    }
  }

  memoryOrgKeys.delete(orgId);
  return deletedCount;
};

const scheduleReconnect = () => {
  if (shutdownRequested || !redisUri || reconnectTimer) return;

  reconnectAttempt += 1;
  const delay = Math.min(1000 * 2 ** Math.max(reconnectAttempt - 1, 0), 30000);

  console.warn(
    `⚠️ Redis unavailable. Retrying connection in ${delay}ms (attempt ${reconnectAttempt}).`,
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await connectRedis();
  }, delay);
};

const createRedisClient = (uri) => {
  const isTls = uri.startsWith("rediss://");

  const client = createClient({
    url: uri,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          return new Error("Redis retry limit exceeded");
        }

        return Math.min(100 * 2 ** retries, 2000);
      },
      ...(isTls && { tls: true, rejectUnauthorized: false }),
    },
  });

  client.on("ready", () => {
    isRedisDisabled = false;
    reconnectAttempt = 0;

    const isLocal = uri.includes("localhost") || uri.includes("127.0.0.1");
    const connectionType = isLocal
      ? "local"
      : uri.includes("upstash")
        ? "Upstash"
        : "remote";

    console.log(`✅ Redis connected successfully (${connectionType})`);
  });

  client.on("reconnecting", () => {
    if (!shutdownRequested) {
      console.warn("⚠️ Redis reconnecting...");
    }
  });

  client.on("error", (err) => {
    if (!shutdownRequested) {
      isRedisDisabled = true;
      console.warn(`⚠️ Redis Client Error: ${err.message}`);
    }
  });

  client.on("end", () => {
    if (!shutdownRequested) {
      isRedisDisabled = true;
      scheduleReconnect();
    }
  });

  return client;
};

const connectRedis = async () => {
  if (
    shutdownRequested ||
    !redisUri ||
    reconnectInProgress ||
    (redisClient && redisClient.isReady)
  ) {
    return;
  }

  reconnectInProgress = true;

  try {
    if (!redisClient) {
      redisClient = createRedisClient(redisUri);
    }

    await redisClient.connect();
    isRedisDisabled = false;
    reconnectAttempt = 0;
  } catch (error) {
    isRedisDisabled = true;

    console.warn(
      `⚠️ Redis connection failed: ${error.message}. Server will continue with in-memory cache fallback.`,
    );

    try {
      if (redisClient?.isOpen) {
        redisClient.disconnect();
      }
    } catch {
      // Ignore cleanup failures while Redis is unavailable.
    }

    redisClient = null;
    scheduleReconnect();
  } finally {
    reconnectInProgress = false;
  }
};

export const initRedis = async () => {
  redisUri = process.env.REDIS_URI || process.env.REDIS_URL;
  shutdownRequested = false;

  if (!redisUri) {
    console.log(
      "ℹ️ Redis is disabled (REDIS_URI/REDIS_URL not provided). Using in-memory cache fallback.",
    );
    isRedisDisabled = true;
    return;
  }

  await connectRedis();
};

let customTestClient = null;

export const overrideRedisClientForTesting = (client) => {
  customTestClient = client;
};

export const closeRedis = async () => {
  shutdownRequested = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const client = redisClient;
  redisClient = null;
  isRedisDisabled = true;
  reconnectAttempt = 0;

  if (!client) return false;

  try {
    if (typeof client.quit === "function" && client.isOpen) {
      await client.quit();
    } else if (typeof client.disconnect === "function") {
      client.disconnect();
    }

    return true;
  } catch (err) {
    console.warn("⚠️ Redis close failed (ignoring):", err.message);
    return false;
  }
};

export const getRedisClient = () =>
  customTestClient !== null
    ? customTestClient
    : isRedisDisabled
      ? null
      : redisClient;

export const acquireLock = async (lockKey, ttlMs = 5000) => {
  const client = getRedisClient();
  if (!client || !client.isReady) return null;

  try {
    const lockToken = crypto.randomUUID();
    const res = await client.set(lockKey, lockToken, { NX: true, PX: ttlMs });
    return res === "OK" ? lockToken : null;
  } catch (err) {
    console.error("⚠️ acquireLock error:", lockKey, err.message);
    return null;
  }
};

export const releaseLock = async (lockKey, lockToken) => {
  if (!lockToken) return false;

  const client = getRedisClient();
  if (!client || !client.isReady) return false;

  try {
    if (typeof client.eval === "function") {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await client.eval(luaScript, {
        keys: [lockKey],
        arguments: [lockToken],
      });
    } else {
      const current = await client.get(lockKey);

      if (current === lockToken) {
        await client.del(lockKey);
      }
    }

    return true;
  } catch (err) {
    console.error("⚠️ releaseLock error:", lockKey, err.message);
    return false;
  }
};

export const setSearchCache = async (
  cacheKey,
  organizationId = "global",
  payload,
  softTTLSec = 300,
  hardTTLSec = 3600,
) => {
  const client = getRedisClient();

  if (!client || !client.isReady) {
    setMemorySearchCache(
      cacheKey,
      organizationId,
      payload,
      softTTLSec,
      hardTTLSec,
    );
    return true;
  }

  try {
    const orgId = organizationId || "global";
    const cacheValue = {
      payload,
      cachedAt: Date.now(),
      softTTL: softTTLSec,
      hardTTL: hardTTLSec,
    };

    await client.setEx(cacheKey, hardTTLSec, JSON.stringify(cacheValue));

    const setKey = `org:${orgId}:search_keys`;
    await client.sAdd(setKey, cacheKey);
    await client.expire(setKey, 86400).catch(() => {});

    return true;
  } catch (err) {
    console.error(
      `⚠️ setSearchCache Redis error for ${cacheKey}: ${err.message}. Falling back to memory cache.`,
    );

    setMemorySearchCache(
      cacheKey,
      organizationId,
      payload,
      softTTLSec,
      hardTTLSec,
    );

    return true;
  }
};

export const getSearchCache = async (cacheKey) => {
  const client = getRedisClient();

  if (!client || !client.isReady) {
    pruneExpiredMemoryCache();
    return memorySearchCache.get(cacheKey)?.payload ?? null;
  }

  try {
    const raw = await client.get(cacheKey);

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed.payload ?? null;
  } catch (err) {
    console.error(
      `⚠️ getSearchCache Redis error for ${cacheKey}: ${err.message}. Checking memory fallback.`,
    );

    pruneExpiredMemoryCache();
    return memorySearchCache.get(cacheKey)?.payload ?? null;
  }
};

export const addKeyToOrgSet = async (organizationId = "global", cacheKey) => {
  const client = getRedisClient();

  if (!client || !client.isReady) {
    const orgId = organizationId || "global";

    if (!memoryOrgKeys.has(orgId)) {
      memoryOrgKeys.set(orgId, new Set());
    }

    memoryOrgKeys.get(orgId).add(cacheKey);
    return true;
  }

  try {
    const orgId = organizationId || "global";
    const setKey = `org:${orgId}:search_keys`;

    await client.sAdd(setKey, cacheKey);
    await client.expire(setKey, 86400).catch(() => {});

    return true;
  } catch (err) {
    console.error(
      `⚠️ addKeyToOrgSet Redis error for ${cacheKey}: ${err.message}. Falling back to memory index.`,
    );

    const orgId = organizationId || "global";

    if (!memoryOrgKeys.has(orgId)) {
      memoryOrgKeys.set(orgId, new Set());
    }

    memoryOrgKeys.get(orgId).add(cacheKey);
    return true;
  }
};

export const getOrgKeys = async (organizationId = "global") => {
  const client = getRedisClient();

  if (!client || !client.isReady) {
    pruneExpiredMemoryCache();
    return [...(memoryOrgKeys.get(organizationId || "global") || new Set())];
  }

  try {
    const orgId = organizationId || "global";
    const setKey = `org:${orgId}:search_keys`;

    return await client.sMembers(setKey);
  } catch (err) {
    console.error(
      `⚠️ getOrgKeys Redis error for ${organizationId}: ${err.message}. Returning memory index.`,
    );

    pruneExpiredMemoryCache();
    return [...(memoryOrgKeys.get(organizationId || "global") || new Set())];
  }
};

export const clearOrgSetAndKeys = async (organizationId = "global") => {
  const client = getRedisClient();

  if (!client || !client.isReady) {
    return clearMemoryOrgCache(organizationId);
  }

  try {
    const orgId = organizationId || "global";
    const setKey = `org:${orgId}:search_keys`;

    if (typeof client.eval === "function") {
      const luaScript = `
        local keys = redis.call('smembers', KEYS[1])
        local count = #keys

        if count > 0 then
          for i, key in ipairs(keys) do
            redis.call('del', key)
          end
        end

        redis.call('del', KEYS[1])
        return count
      `;

      const res = await client.eval(luaScript, { keys: [setKey] });

      clearMemoryOrgCache(orgId);
      return Number(res) || 0;
    }

    const keys = await client.sMembers(setKey);
    let deletedCount = 0;

    if (keys && keys.length > 0) {
      const multi = client.multi();

      keys.forEach((key) => multi.del(key));
      multi.del(setKey);

      await multi.exec();
      deletedCount = keys.length;
    } else {
      await client.del(setKey);
    }

    clearMemoryOrgCache(orgId);
    return deletedCount;
  } catch (err) {
    console.error(
      `⚠️ clearOrgSetAndKeys Redis error for ${organizationId}: ${err.message}. Clearing memory fallback.`,
    );

    return clearMemoryOrgCache(organizationId);
  }
};
