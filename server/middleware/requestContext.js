import { randomUUID } from "node:crypto";
import logger from "../utils/logger.js";

export const REQUEST_ID_HEADER = "X-Request-ID";
export const MAX_REQUEST_ID_LENGTH = 128;

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * Validate an externally supplied request ID before using it in logs or
 * response headers. Control characters, whitespace, and unbounded values are
 * rejected to prevent log/header injection.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
export function isValidRequestId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    SAFE_REQUEST_ID_PATTERN.test(value)
  );
}

/**
 * Resolve a valid incoming request ID or generate a cryptographically strong
 * UUID for this request.
 *
 * @param {unknown} incomingId
 * @returns {string}
 */
export function resolveRequestId(incomingId) {
  return isValidRequestId(incomingId) ? incomingId : randomUUID();
}

/**
 * Recursively redact sensitive values before writing request metadata to logs.
 * Kept here as a compatibility export for the existing security-health tests.
 */
export function redact(value) {
  if (
    value == null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  const seen = new WeakSet();
  const sensitiveKey =
    /authorization|cookie|password|passwd|secret|token|api[-_]?key|access[-_]?token|refresh[-_]?token|file|upload/i;

  const visit = (input, depth = 0) => {
    if (
      input == null ||
      typeof input === "boolean" ||
      typeof input === "number" ||
      typeof input === "string"
    ) {
      return input;
    }
    if (typeof input !== "object") return String(input);
    if (depth >= 5) return "[MAX_DEPTH]";
    if (seen.has(input)) return "[CIRCULAR]";
    seen.add(input);

    if (Array.isArray(input)) {
      return input.slice(0, 50).map((item) => visit(item, depth + 1));
    }

    return Object.fromEntries(
      Object.entries(input).map(([key, nestedValue]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : visit(nestedValue, depth + 1),
      ]),
    );
  };

  return visit(value);
}

/**
 * Build the minimal request context needed to correlate a failed request.
 */
export function buildLogContext(req) {
  if (!req) return {};

  const startedAt =
    typeof req.startedAt === "number" ? req.startedAt : Date.now();

  return {
    requestId: req.requestId || req.id || null,
    method: req.method || null,
    path: req.originalUrl || req.url || null,
    userId: req.user?.id || req.user?._id?.toString?.() || null,
    ip: req.ip || null,
    durationMs: Math.max(0, Date.now() - startedAt),
  };
}

/**
 * Attach request-scoped correlation data and structured completion logging.
 */
export function requestContext(req, res, next) {
  const requestId = resolveRequestId(req.get(REQUEST_ID_HEADER));
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  req.id = requestId;
  req.startedAt = Date.now();
  req.log = logger.child(buildLogContext(req));
  res.setHeader(REQUEST_ID_HEADER, requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    req.log.info("HTTP request completed", {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
}

export default requestContext;
