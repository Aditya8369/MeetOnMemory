import { AppError } from "../utils/errors.js";
import { sendCsrfInvalid } from "../utils/csrfErrors.js";
import logger from "../utils/logger.js";
import { buildLogContext, redact } from "./requestContext.js";

/**
 * Structural ZodError check (no `import "zod"`).
 *
 * Controllers still throw real ZodErrors from `zod`; we only need the public
 * shape here. Skipping a static zod import keeps this middleware out of zod's
 * large ESM graph under Jest's VM linker.
 *
 * @param {unknown} err
 */
function isZodError(err) {
  return (
    err instanceof Error && err.name === "ZodError" && Array.isArray(err.issues)
  );
}

/**
 * Global Express error-handling middleware.
 *
 * Replaces all the scattered `catch (err) → res.status(500).json(...)` blocks
 * that previously lived inside every controller.  Any error passed to `next(err)`
 * — or thrown inside an `async` route handler that is wrapped with a try/catch
 * calling `next(err)` — lands here.
 *
 * Handled error types:
 *  • AppError subclasses (ValidationError, NotFoundError, …) — uses their
 *    built-in statusCode.
 *  • ZodError — schema parse failure → 400 with per-field issue list.
 *  • Mongoose ValidationError — maps to 400 with field messages.
 *  • Mongoose CastError — maps to 400 "Invalid ID" response.
 *  • CSRF token failure (EBADCSRFTOKEN) — maps to 403 + CSRF_INVALID.
 *  • Everything else — 500 Internal Server Error (message hidden in prod).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // ── CSRF ────────────────────────────────────────────────────
  if (err.code === "EBADCSRFTOKEN") {
    return sendCsrfInvalid(res);
  }

  // ── Zod schema validation errors ────────────────────────────
  if (isZodError(err)) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      details,
    });
  }

  // ── Our custom AppError hierarchy ───────────────────────────
  if (err instanceof AppError) {
    const payload = {
      success: false,
      message: err.message,
    };
    if (err.details) payload.details = err.details;
    return res.status(err.statusCode).json(payload);
  }

  // ── Mongoose ValidationError (schema-level) ─────────────────
  if (err.name === "ValidationError" && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Invalid data provided.",
      details,
    });
  }

  // ── Oversized request body ───────────────────────────────────
  // body-parser raises `entity.too.large`, which previously fell through to the
  // catch-all and was reported as a 500 — telling the client "we broke" when in
  // fact they sent too much. 413 is both accurate and actionable.
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
    });
  }

  // ── Malformed JSON body ──────────────────────────────────────
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body.",
    });
  }

  // ── Mongoose CastError (bad ObjectId format) ─────────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field '${err.path}'.`,
    });
  }

  // ── Everything else → 500 ────────────────────────────────────
  // Log the full error for server-side debugging but never expose
  // raw stack traces or internal messages in production.
  //
  // Issue #979: this used to be a bare `console.error("❌ Unhandled error:",
  // err)` with no request context at all, so a user reporting "it failed" gave
  // us nothing to search for. It now goes through the structured logger with a
  // correlation id — which is also echoed to the client in `X-Request-Id`, so
  // the user has an identifier to quote.
  const context = buildLogContext(req);
  logger.error("Unhandled request error", err, redact(context));

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    success: false,
    message: isProd
      ? "Internal Server Error"
      : err.message || "Internal Server Error",
    // Safe to expose in both environments: it identifies the log line, not the
    // failure, and the client already received it as a response header.
    ...(context.requestId ? { requestId: context.requestId } : {}),
    ...(isProd ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
