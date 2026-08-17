import {
  buildMeetingSummaryCacheKey,
  clearMeetingSummaryCache,
  clearMeetingSummaryLocalCacheForTests,
  generateCachedMeetingSummary,
} from "../services/meetingSummaryCache.js";
import { overrideRedisClientForTesting } from "../services/redisService.js";

describe("meeting summary cache", () => {
  afterEach(() => {
    clearMeetingSummaryLocalCacheForTests();
    overrideRedisClientForTesting(null);
  });

  test("uses the same versioned key for equivalent inputs", () => {
    const first = buildMeetingSummaryCacheKey({
      meetingId: "meeting-1",
      transcript: "hello",
      date: "2026-08-17",
      title: "Weekly sync",
    });

    const second = buildMeetingSummaryCacheKey({
      meetingId: "meeting-1",
      transcript: "hello",
      date: "2026-08-17",
      title: "Weekly sync",
    });

    expect(first).toBe(second);
    expect(first).toContain("meeting-summary:");
  });

  test("does not call the generator twice for a fresh cached result", async () => {
    const generator = jest.fn().mockResolvedValue({
      summary: "cached summary",
    });

    const input = {
      meetingId: "meeting-1",
      transcript: "same transcript",
      date: "2026-08-17",
      title: "Weekly sync",
      generator,
    };

    await expect(generateCachedMeetingSummary(input)).resolves.toEqual({
      summary: "cached summary",
    });

    await expect(generateCachedMeetingSummary(input)).resolves.toEqual({
      summary: "cached summary",
    });

    expect(generator).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent generation", async () => {
    let resolveGeneration;
    const generator = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        }),
    );

    const input = {
      meetingId: "meeting-2",
      transcript: "concurrent transcript",
      date: "2026-08-17",
      title: "Planning",
      generator,
    };

    const first = generateCachedMeetingSummary(input);
    const second = generateCachedMeetingSummary(input);

    expect(generator).toHaveBeenCalledTimes(1);

    resolveGeneration({ summary: "generated once" });

    await expect(first).resolves.toEqual({ summary: "generated once" });
    await expect(second).resolves.toEqual({ summary: "generated once" });
  });

  test("stores and reads through the Redis adapter when available", async () => {
    const store = new Map();
    const client = {
      isReady: true,
      get: jest.fn(async (key) => store.get(key) ?? null),
      setEx: jest.fn(async (key, _ttl, value) => {
        store.set(key, value);
        return "OK";
      }),
      del: jest.fn(async (key) => {
        store.delete(key);
        return 1;
      }),
    };

    overrideRedisClientForTesting(client);

    const generator = jest.fn().mockResolvedValue({
      summary: "redis summary",
    });

    await generateCachedMeetingSummary({
      meetingId: "meeting-3",
      transcript: "redis transcript",
      date: "2026-08-17",
      title: "Redis",
      generator,
    });

    clearMeetingSummaryLocalCacheForTests();

    await expect(
      generateCachedMeetingSummary({
        meetingId: "meeting-3",
        transcript: "redis transcript",
        date: "2026-08-17",
        title: "Redis",
        generator,
      }),
    ).resolves.toEqual({
      summary: "redis summary",
    });

    expect(generator).toHaveBeenCalledTimes(1);
    expect(client.setEx).toHaveBeenCalledTimes(1);
  });

  test("clear removes a cached summary", async () => {
    const generator = jest.fn().mockResolvedValue({
      summary: "to be cleared",
    });

    const input = {
      meetingId: "meeting-4",
      transcript: "clear me",
      date: "2026-08-17",
      title: "Clear",
      generator,
    };

    await generateCachedMeetingSummary(input);
    await clearMeetingSummaryCache(input);

    await generateCachedMeetingSummary(input);

    expect(generator).toHaveBeenCalledTimes(2);
  });
});
