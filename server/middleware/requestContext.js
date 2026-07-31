import crypto from "crypto";

// server/middleware/requestContext.js
//
// Issue #979 — errors were untraceable.
//
// `middleware/errorHandler.js` logged failures as:
//
//     console.error("❌ Unhandled error:", err);
//
// No request id, no method, no path, no user, and no correlation with the
// response the client received. When a user reports "it failed", there was no
// identifier to search for — and because responses carried no correlation
// header either, there was nothing for them to quote.
//
// There is already a structured logger in `utils/logger.js`; the error handler
// just wasn't using it.

/** Header the id is read from and echoed on. */
export const REQUEST_ID_HEADER = "X-Request-Id";

/**
 * Rejects an inbound id that isn't plausibly one.
 *
 * The value is echoed back in a response header and written into logs, so it is
 * attacker-controlled input. Restricting it to a short, safe character set stops
 * header injection and log forging (a newline in a log line can fabricate
 * entries).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export const isValidRequestId = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 128 &&
  /^[A-Za-z0-9._-]+$/.test(value);

/**
 * Attaches a correlation id to every request.
 *
 * An inbound `X-Request-Id` is preferred (so a trace started at a load balancer
 * or by the SPA carries through), and generated otherwise.
 *
 * @returns {import("express").RequestHandler}
 */
export const requestContext = () => (req, res, next) => {
  const inbound = req.get?.(REQUEST_ID_HEADER);

  req.id = isValidRequestId(inbound) ? inbound : crypto.randomUUID();
  req.startedAt = Date.now();

  // Echo it so a user can quote the id from their network tab, and so a client
  // can attach it to its own error reports.
  res.setHeader(REQUEST_ID_HEADER, req.id);

  next();
};

/** Fields that must never reach a log line. */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "accesstoken",
  "refreshtoken",
  "clientsecret",
  "signature",
]);

/**
 * Recursively redacts sensitive values.
 *
 * Errors carry request context into logs, and this repo has already had to fix
 * "sensitive authentication data in server logs" once (#612). Redacting at the
 * logging boundary means a future field added to a request body can't quietly
 * become a credential leak.
 *
 * @param {any} value
 * @param {number} [depth]
 */
export const redact = (value, depth = 0) => {
  if (depth > 4 || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1));
  }

  const output = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = "[REDACTED]";
    } else {
      output[key] = redact(val, depth + 1);
    }
  }
  return output;
};

/**
 * Builds the structured context attached to an error log.
 *
 * @param {import("express").Request} req
 * @returns {object}
 */
export const buildLogContext = (req) => {
  if (!req) return {};

  return {
    requestId: req.id ?? null,
    method: req.method,
    path: req.originalUrl ?? req.url,
    userId: req.user?.id ?? req.user?._id?.toString?.() ?? null,
    organizationId: req.organizationId ?? null,
    ip: req.ip,
    durationMs: req.startedAt ? Date.now() - req.startedAt : null,
  };
};

export default requestContext;
