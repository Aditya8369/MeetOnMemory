/**
 * Signed Calendar OAuth `state` tokens (Issue #1387).
 *
 * Mirrors the Slack OAuth JWT pattern: bind user + provider into a short-lived
 * signed token so the callback never trusts a raw client-supplied userId.
 *
 * Replay protection: each token carries a unique `jti` (nonce). On successful
 * verification the nonce is marked consumed (Redis SET NX when available,
 * otherwise an in-memory TTL map).
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getRedisClient } from "../services/redisService.js";

const STATE_TTL_SECONDS = 15 * 60;
const STATE_PURPOSE = "calendar_oauth";
const REDIS_KEY_PREFIX = "calendar:oauth:state:";

/** @type {Map<string, number>} nonce -> expiry epoch ms */
const consumedNonces = new Map();

export class CalendarOAuthStateError extends Error {
  /**
   * @param {"missing"|"invalid"|"expired"|"replay"|"provider_mismatch"|"user_mismatch"} code
   * @param {string} message
   * @param {number} [status=400]
   */
  constructor(code, message, status = 400) {
    super(message);
    this.name = "CalendarOAuthStateError";
    this.code = code;
    this.status = status;
  }
}

const getSigningSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required to sign calendar OAuth state");
  }
  return secret;
};

const pruneExpiredNonces = (now = Date.now()) => {
  for (const [nonce, expiresAt] of consumedNonces.entries()) {
    if (expiresAt <= now) {
      consumedNonces.delete(nonce);
    }
  }
};

/**
 * Mark a nonce as consumed. Returns false if it was already used.
 * @param {string} nonce
 * @param {number} ttlSeconds
 */
const consumeNonce = async (nonce, ttlSeconds = STATE_TTL_SECONDS) => {
  const ttlMs = Math.max(ttlSeconds, 1) * 1000;
  const client = getRedisClient();

  if (client?.isReady) {
    try {
      const result = await client.set(`${REDIS_KEY_PREFIX}${nonce}`, "1", {
        NX: true,
        PX: ttlMs,
      });
      return result === "OK";
    } catch (err) {
      console.warn(
        "[calendarOAuthState] Redis consume failed, falling back to memory:",
        err.message,
      );
    }
  }

  pruneExpiredNonces();
  if (consumedNonces.has(nonce)) {
    return false;
  }
  consumedNonces.set(nonce, Date.now() + ttlMs);
  return true;
};

/**
 * Create a signed OAuth state token bound to the authenticated user + provider.
 *
 * @param {{ userId: string|import("mongoose").Types.ObjectId, provider: "google"|"microsoft"|"outlook" }} params
 * @returns {string}
 */
export const createCalendarOAuthState = ({ userId, provider }) => {
  if (!userId) {
    throw new CalendarOAuthStateError(
      "missing",
      "User ID required for OAuth state",
    );
  }
  if (!provider) {
    throw new CalendarOAuthStateError(
      "missing",
      "Provider required for OAuth state",
    );
  }

  const normalizedProvider =
    provider === "outlook" ? "microsoft" : String(provider);

  const nonce = crypto.randomBytes(16).toString("hex");

  return jwt.sign(
    {
      purpose: STATE_PURPOSE,
      userId: userId.toString(),
      provider: normalizedProvider,
      jti: nonce,
    },
    getSigningSecret(),
    { expiresIn: STATE_TTL_SECONDS },
  );
};

/**
 * Verify signature/expiry/provider and consume the nonce (single-use).
 *
 * @param {unknown} stateToken
 * @param {{ expectedProvider: "google"|"microsoft"|"outlook", expectedUserId?: string }} options
 * @returns {Promise<{ userId: string, provider: string, jti: string }>}
 */
export const verifyAndConsumeCalendarOAuthState = async (
  stateToken,
  { expectedProvider, expectedUserId } = {},
) => {
  if (!stateToken || typeof stateToken !== "string") {
    throw new CalendarOAuthStateError("missing", "Missing OAuth state");
  }

  const normalizedExpected =
    expectedProvider === "outlook" ? "microsoft" : expectedProvider;

  let decoded;
  try {
    decoded = jwt.verify(stateToken, getSigningSecret());
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      throw new CalendarOAuthStateError("expired", "Expired OAuth state");
    }
    throw new CalendarOAuthStateError("invalid", "Invalid OAuth state");
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    decoded.purpose !== STATE_PURPOSE ||
    !decoded.userId ||
    !decoded.provider ||
    !decoded.jti
  ) {
    throw new CalendarOAuthStateError("invalid", "Invalid OAuth state");
  }

  if (normalizedExpected && decoded.provider !== normalizedExpected) {
    throw new CalendarOAuthStateError(
      "provider_mismatch",
      "OAuth state provider mismatch",
    );
  }

  if (
    expectedUserId &&
    decoded.userId.toString() !== expectedUserId.toString()
  ) {
    throw new CalendarOAuthStateError(
      "user_mismatch",
      "OAuth state user mismatch",
      403,
    );
  }

  const remainingSeconds =
    typeof decoded.exp === "number"
      ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1)
      : STATE_TTL_SECONDS;

  const consumed = await consumeNonce(decoded.jti, remainingSeconds);
  if (!consumed) {
    throw new CalendarOAuthStateError("replay", "OAuth state already used");
  }

  return {
    userId: decoded.userId.toString(),
    provider: decoded.provider,
    jti: decoded.jti,
  };
};

/** Test helper — clear in-memory consumed nonces. */
export const __resetCalendarOAuthStateStoreForTests = () => {
  consumedNonces.clear();
};
