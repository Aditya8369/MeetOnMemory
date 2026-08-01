import { AppError } from "../utils/errors.js";
import { sendCsrfInvalid } from "../utils/csrfErrors.js";
import logger from "../utils/logger.js";

function isZodError(err) {
  return (
    err instanceof Error && err.name === "ZodError" && Array.isArray(err.issues)
  );
}

function withRequestId(req, payload) {
  return {
    ...payload,
    requestId: req?.requestId,
  };
}

function getRequestLogger(req) {
  return req?.log || logger.child({ requestId: req?.requestId });
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const requestLog = getRequestLogger(req);

  if (err.code === "EBADCSRFTOKEN") {
    requestLog.warn("CSRF validation failed", {
      method: req?.method,
      path: req?.originalUrl,
      statusCode: 403,
    });
    return sendCsrfInvalid(res, req?.requestId);
  }

  if (isZodError(err)) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    requestLog.warn("Request validation failed", {
      method: req?.method,
      path: req?.originalUrl,
      statusCode: 400,
      details,
    });
    return res.status(400).json(
      withRequestId(req, {
        success: false,
        message: "Validation failed.",
        details,
      }),
    );
  }

  if (err instanceof AppError) {
    const payload = {
      success: false,
      message: err.message,
    };
    if (err.details) payload.details = err.details;
    requestLog.warn("Handled application error", {
      method: req?.method,
      path: req?.originalUrl,
      statusCode: err.statusCode,
      errorName: err.name,
    });
    return res.status(err.statusCode).json(withRequestId(req, payload));
  }

  if (err.name === "ValidationError" && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    requestLog.warn("Mongoose validation failed", {
      method: req?.method,
      path: req?.originalUrl,
      statusCode: 400,
      details,
    });
    return res.status(400).json(
      withRequestId(req, {
        success: false,
        message: "Invalid data provided.",
        details,
      }),
    );
  }

  if (err.name === "CastError") {
    requestLog.warn("Invalid database identifier", {
      method: req?.method,
      path: req?.originalUrl,
      statusCode: 400,
      field: err.path,
    });
    return res.status(400).json(
      withRequestId(req, {
        success: false,
        message: `Invalid value for field '${err.path}'.`,
      }),
    );
  }

  requestLog.error("Unhandled request error", err, {
    method: req?.method,
    path: req?.originalUrl,
    statusCode: 500,
  });

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json(
    withRequestId(req, {
      success: false,
      message: isProd
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
      ...(isProd ? {} : { stack: err.stack }),
    }),
  );
};

export default errorHandler;
