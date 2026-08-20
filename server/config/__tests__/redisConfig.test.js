import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRedis } from "../health.js";

describe("Redis Production Configuration & Health Probe (#1677)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_URI;
    delete process.env.REDIS_URL;
  });

  it("reports disabled when neither REDIS_URI nor REDIS_URL is provided", async () => {
    const res = await checkRedis();
    expect(res.status).toBe("disabled");
    expect(res.required).toBe(false);
    expect(res.detail).toBe("not configured");
  });

  it("reports up when redis is reachable and ping succeeds", async () => {
    process.env.REDIS_URI = "rediss://production-redis.render.com:6379";
    const mockClient = {
      ping: vi.fn().mockResolvedValue("PONG"),
    };

    const res = await checkRedis({ client: mockClient });
    expect(res.status).toBe("up");
    expect(res.required).toBe(false);
    expect(typeof res.latencyMs).toBe("number");
  });

  it("reports degraded when redis client throws during ping", async () => {
    process.env.REDIS_URI = "rediss://production-redis.render.com:6379";
    const mockClient = {
      ping: vi.fn().mockRejectedValue(new Error("Connection refused")),
    };

    const res = await checkRedis({ client: mockClient });
    expect(res.status).toBe("degraded");
    expect(res.required).toBe(false);
    expect(res.detail).toBe("Connection refused");
  });
});
