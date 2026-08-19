import crypto from "node:crypto";
import { getRedisClient } from "./redisService.js";

const CACHE_VERSION = process.env.MEETING_SUMMARY_CACHE_VERSION || "v1";
const HARD_TTL_SECONDS = Number.parseInt(
  process.env.MEETING_SUMMARY_CACHE_TTL_SECONDS || "3600",
  10,
);
const STALE_TTL_SECONDS = Number.parseInt(
  process.env.MEETING_SUMMARY_CACHE_STALE_SECONDS || "300",
  10,
);

const localCache = new Map();
const refreshes = new Map();

const now = () => Date.now();

const getTtl = (value, fallback) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const stableHash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const buildMeetingSummaryCacheKey = ({
  meetingId = null,
  transcript = "",
  date = null,
  title = null,
  customInstructions = null,
}) =>
  `meeting-summary:${CACHE_VERSION}:${stableHash({
    meetingId,
    transcript,
    date,
    title,
    customInstructions,
  })}`;

const readLocal = (key) => {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (entry.hardExpiresAt <= now()) {
    localCache.delete(key);
    return null;
  }
  return entry;
};

const writeLocal = (key, payload) => {
  const hardTtlMs = getTtl(HARD_TTL_SECONDS, 3600) * 1000;
  localCache.set(key, {
    payload,
    cachedAt: now(),
    staleAt: now() + getTtl(STALE_TTL_SECONDS, 300) * 1000,
    hardExpiresAt: now() + hardTtlMs,
    version: CACHE_VERSION,
  });
};

const readRedis = async (key) => {
  const client = getRedisClient();
  if (!client || !client.isReady) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.version !== CACHE_VERSION ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("Meeting summary cache read failed:", error.message);
    return null;
  }
};

const writeRedis = async (key, payload) => {
  const client = getRedisClient();
  if (!client || !client.isReady) return false;

  try {
    const hardTtl = getTtl(HARD_TTL_SECONDS, 3600);
    await client.setEx(
      key,
      hardTtl,
      JSON.stringify({
        payload,
        cachedAt: now(),
        staleAt: now() + getTtl(STALE_TTL_SECONDS, 300) * 1000,
        version: CACHE_VERSION,
      }),
    );
    return true;
  } catch (error) {
    console.warn("Meeting summary cache write failed:", error.message);
    return false;
  }
};

const refresh = async (key, generator) => {
  if (refreshes.has(key)) return refreshes.get(key);

  const task = Promise.resolve()
    .then(generator)
    .then(async (payload) => {
      writeLocal(key, payload);
      await writeRedis(key, payload);
      return payload;
    })
    .finally(() => {
      refreshes.delete(key);
    });

  refreshes.set(key, task);
  return task;
};

export const getCachedMeetingSummary = async ({ cacheKey, generator }) => {
  if (!cacheKey) {
    return generator();
  }

  const local = readLocal(cacheKey);
  if (local) {
    if (local.staleAt <= now()) {
      void refresh(cacheKey, generator).catch((error) => {
        console.warn("Meeting summary stale refresh failed:", error.message);
      });
    }
    return local.payload;
  }

  const remote = await readRedis(cacheKey);
  if (remote) {
    writeLocal(cacheKey, remote.payload);

    if (remote.staleAt <= now()) {
      void refresh(cacheKey, generator).catch((error) => {
        console.warn("Meeting summary stale refresh failed:", error.message);
      });
    }

    return remote.payload;
  }

  return refresh(cacheKey, generator);
};

export const generateCachedMeetingSummary = async ({
  meetingId,
  transcript,
  date,
  title,
  customInstructions = null,
  generator,
}) => {
  const cacheKey = buildMeetingSummaryCacheKey({
    meetingId,
    transcript,
    date,
    title,
    customInstructions,
  });

  return getCachedMeetingSummary({
    cacheKey,
    generator,
  });
};

export const clearMeetingSummaryCache = async ({
  meetingId,
  transcript,
  date,
  title,
  customInstructions = null,
}) => {
  const key = buildMeetingSummaryCacheKey({
    meetingId,
    transcript,
    date,
    title,
    customInstructions,
  });

  localCache.delete(key);

  const client = getRedisClient();
  if (!client || !client.isReady) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.warn("Meeting summary cache clear failed:", error.message);
    return false;
  }
};

export const clearMeetingSummaryLocalCacheForTests = () => {
  localCache.clear();
  refreshes.clear();
};
