// server/utils/logger.js

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|passwd|secret|token|api[-_]?key|access[-_]?token|refresh[-_]?token|file|upload/i;
const MAX_REDACTION_DEPTH = 5;

function sanitizeLogValue(value, depth = 0, seen = new WeakSet()) {
  if (
    value == null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  }

  if (depth >= MAX_REDACTION_DEPTH) return "[MAX_DEPTH]";
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeLogValue(item, depth + 1, seen));
  }

  const sanitized = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[REDACTED]"
      : sanitizeLogValue(nestedValue, depth + 1, seen);
  }
  return sanitized;
}

/**
 * Lightweight structured JSON logger with request-scoped child loggers and
 * recursive sensitive-field redaction.
 */
class Logger {
  constructor(context = {}) {
    this.context = sanitizeLogValue(context);
  }

  child(context = {}) {
    return new Logger({ ...this.context, ...sanitizeLogValue(context) });
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...sanitizeLogValue(meta),
    });
  }

  info(message, meta = {}) {
    console.log(this.formatMessage("info", message, meta));
  }

  warn(message, meta = {}) {
    console.warn(this.formatMessage("warn", message, meta));
  }

  error(message, error = null, meta = {}) {
    const errorDetails =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          }
        : error
          ? { errorMessage: String(error) }
          : {};

    console.error(
      this.formatMessage("error", message, { ...meta, ...errorDetails }),
    );
  }
}

export { Logger, sanitizeLogValue };
export default new Logger();
