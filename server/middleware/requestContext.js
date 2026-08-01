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
 * Attach request-scoped correlation data and structured completion logging.
 */
export function requestContext(req, res, next) {
  const requestId = resolveRequestId(req.get(REQUEST_ID_HEADER));
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  req.log = logger.child({ requestId });
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
