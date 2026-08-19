import { jest } from "@jest/globals";

describe("Redis graceful degradation", () => {
  let redisService;

  beforeEach(async () => {
    jest.resetModules();
    process.env.REDIS_URI = "";
    process.env.REDIS_URL = "";
    redisService = await import("../services/redisService.js");
  });

  afterEach(async () => {
    await redisService.closeRedis();
    delete process.env.REDIS_URI;
    delete process.env.REDIS_URL;
  });

  test("uses the in-memory search cache when Redis is unavailable", async () => {
    await redisService.initRedis();

    await expect(
      redisService.setSearchCache(
        "test-cache-key",
        "test-org",
        { value: "fallback" },
        300,
        60,
      ),
    ).resolves.toBe(true);

    await expect(
      redisService.getSearchCache("test-cache-key"),
    ).resolves.toEqual({ value: "fallback" });

    await expect(redisService.getOrgKeys("test-org")).resolves.toContain(
      "test-cache-key",
    );
  });

  test("invalidates in-memory organization cache", async () => {
    await redisService.initRedis();

    await redisService.setSearchCache(
      "cache-one",
      "test-org",
      { value: 1 },
      300,
      60,
    );

    await redisService.setSearchCache(
      "cache-two",
      "test-org",
      { value: 2 },
      300,
      60,
    );

    await expect(redisService.clearOrgSetAndKeys("test-org")).resolves.toBe(2);

    await expect(redisService.getSearchCache("cache-one")).resolves.toBeNull();

    await expect(redisService.getSearchCache("cache-two")).resolves.toBeNull();
  });
});
