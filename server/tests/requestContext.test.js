import express from "express";
import request from "supertest";
import requestContext, {
  MAX_REQUEST_ID_LENGTH,
  isValidRequestId,
} from "../middleware/requestContext.js";
import errorHandler from "../middleware/errorHandler.js";
import { ValidationError } from "../utils/errors.js";
import { Logger, sanitizeLogValue } from "../utils/logger.js";

function createApp() {
  const app = express();
  app.use(requestContext);
  app.get("/ok", (req, res) => res.json({ ok: true }));
  app.get("/validation", () => {
    throw new ValidationError("Invalid input");
  });
  app.get("/boom", () => {
    throw new Error("Database internals should remain private");
  });
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "The requested resource was not found.",
      requestId: req.requestId,
    });
  });
  app.use(errorHandler);
  return app;
}

describe("request correlation middleware", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    jest.restoreAllMocks();
  });

  it("generates a request ID and returns it on successful responses", async () => {
    const response = await request(createApp()).get("/ok");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("preserves a valid incoming request ID", async () => {
    const response = await request(createApp())
      .get("/ok")
      .set("X-Request-ID", "client-request_123:retry-1");

    expect(response.headers["x-request-id"]).toBe("client-request_123:retry-1");
  });

  it("replaces oversized and control-character request IDs", async () => {
    const oversized = "a".repeat(MAX_REQUEST_ID_LENGTH + 1);
    const oversizedResponse = await request(createApp())
      .get("/ok")
      .set("X-Request-ID", oversized);

    expect(oversizedResponse.headers["x-request-id"]).not.toBe(oversized);
    expect(isValidRequestId("line\nbreak")).toBe(false);
  });

  it("includes the same request ID in validation and 404 errors", async () => {
    const validation = await request(createApp())
      .get("/validation")
      .set("X-Request-ID", "validation-ref-1");
    const missing = await request(createApp())
      .get("/missing")
      .set("X-Request-ID", "missing-ref-1");

    expect(validation.status).toBe(400);
    expect(validation.body.requestId).toBe("validation-ref-1");
    expect(validation.headers["x-request-id"]).toBe("validation-ref-1");
    expect(missing.status).toBe(404);
    expect(missing.body.requestId).toBe("missing-ref-1");
  });

  it("does not expose stack traces for production 500 responses", async () => {
    process.env.NODE_ENV = "production";
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(createApp())
      .get("/boom")
      .set("X-Request-ID", "server-error-ref");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal Server Error",
      requestId: "server-error-ref",
    });
  });

  it("generates distinct IDs for concurrent requests", async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request(createApp()).get("/ok")),
    );
    const ids = responses.map((response) => response.headers["x-request-id"]);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("structured logger redaction", () => {
  it("redacts sensitive nested fields without mutating safe metadata", () => {
    const sanitized = sanitizeLogValue({
      requestId: "req-1",
      headers: {
        authorization: "Bearer secret",
        cookie: "session=secret",
        accept: "application/json",
      },
      body: {
        password: "secret",
        apiKey: "secret",
        title: "Weekly sync",
      },
      uploadedFile: { buffer: "binary" },
    });

    expect(sanitized).toMatchObject({
      requestId: "req-1",
      headers: {
        authorization: "[REDACTED]",
        cookie: "[REDACTED]",
        accept: "application/json",
      },
      body: {
        password: "[REDACTED]",
        apiKey: "[REDACTED]",
        title: "Weekly sync",
      },
      uploadedFile: "[REDACTED]",
    });
  });

  it("includes child request context in log output", () => {
    const logger = new Logger().child({ requestId: "req-child" });
    const parsed = JSON.parse(logger.formatMessage("info", "test", {}));

    expect(parsed.requestId).toBe("req-child");
  });
});
