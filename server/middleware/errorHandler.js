import { AppError } from "../utils/errors.js";

/**
 * Structural ZodError check (no `import "zod"`).
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
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
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

  if (err instanceof AppError) {
    const payload = {
      success: false,
      message: err.message,
    };
    if (err.details) payload.details = err.details;
    return res.status(err.statusCode).json(payload);
  }

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

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field '${err.path}'.`,
    });
  }

  console.error("❌ Unhandled error:", err);

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    success: false,
    message: isProd
      ? "Internal Server Error"
      : err.message || "Internal Server Error",
    ...(isProd ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
