import { jest } from "@jest/globals";

jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: jest.fn(),
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findById: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ _id: "mongo-id" }),
    })),
  },
}));

jest.unstable_mockModule("../services/authLinkingService.js", () => ({
  findUserByClerkId: jest
    .fn()
    .mockResolvedValue({ _id: "clerk-linked-mongo-id" }),
  provisionOrLinkClerkUser: jest
    .fn()
    .mockResolvedValue({ _id: "provisioned-mongo-id" }),
}));

const loggerInfo = jest.fn();
const loggerError = jest.fn();

jest.unstable_mockModule("../utils/logger.js", () => ({
  default: {
    info: loggerInfo,
    warn: jest.fn(),
    error: loggerError,
  },
}));

describe("userAuth Middleware Dual Auth", () => {
  let userAuth;
  let verifyTokenMock;
  let jwtVerifyMock;

  beforeAll(async () => {
    const clerk = await import("@clerk/express");
    verifyTokenMock = clerk.verifyToken;

    const jwt = await import("jsonwebtoken");
    jwtVerifyMock = jwt.default.verify;

    const authModule = await import("../middleware/userAuth.js");
    userAuth = authModule.default;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should authenticate using legacy JWT when AUTH_PROVIDER is legacy", async () => {
    process.env.AUTH_PROVIDER = "legacy";
    process.env.JWT_SECRET = "secret";

    const req = { header: () => "Bearer legacy-token" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    jwtVerifyMock.mockReturnValue({ id: "mongo-id" });

    await userAuth(req, res, next);

    expect(jwtVerifyMock).toHaveBeenCalledWith("legacy-token", "secret");
    expect(verifyTokenMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should authenticate using Clerk when AUTH_PROVIDER is clerk", async () => {
    process.env.AUTH_PROVIDER = "clerk";
    process.env.CLERK_SECRET_KEY = "clerk-secret";

    const req = { header: () => "Bearer clerk-token" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyTokenMock.mockResolvedValue({ sub: "user_2xyz" });

    await userAuth(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledWith("clerk-token", {
      secretKey: "clerk-secret",
    });
    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should fallback to legacy JWT when AUTH_PROVIDER is dual and clerk fails", async () => {
    process.env.AUTH_PROVIDER = "dual";

    const req = { header: () => "Bearer dual-token" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyTokenMock.mockRejectedValue(new Error("Invalid clerk token"));
    jwtVerifyMock.mockReturnValue({ id: "mongo-id" });

    await userAuth(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalled();
    expect(jwtVerifyMock).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe("userAuth sensitive log sanitization", () => {
  let userAuth;
  let sanitizeAuthRequestForLog;
  let jwtVerifyMock;

  beforeAll(async () => {
    const jwt = await import("jsonwebtoken");
    jwtVerifyMock = jwt.default.verify;

    const authModule = await import("../middleware/userAuth.js");
    userAuth = authModule.default;
    sanitizeAuthRequestForLog = authModule.sanitizeAuthRequestForLog;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("redacts Authorization headers and cookies from sanitized log context", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/user/data",
      ip: "127.0.0.1",
      headers: {
        origin: "http://localhost:5173",
        authorization: "Bearer super-secret-token",
        cookie: "token=super-secret-cookie",
      },
      cookies: { token: "super-secret-cookie" },
      header: (name) =>
        name === "Authorization" ? "Bearer super-secret-token" : undefined,
    };

    const safe = sanitizeAuthRequestForLog(req);

    expect(safe).toEqual({
      method: "GET",
      url: "/api/user/data",
      ip: "127.0.0.1",
      origin: "http://localhost:5173",
      hasAuthCookie: true,
      hasAuthorizationHeader: true,
    });
    expect(JSON.stringify(safe)).not.toMatch(/super-secret/i);
    expect(safe).not.toHaveProperty("cookies");
    expect(safe).not.toHaveProperty("authorization");
    expect(safe).not.toHaveProperty("headers");
  });

  it("logs only sanitized metadata in non-production and never logs credentials", async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.AUTH_PROVIDER = "legacy";
    process.env.JWT_SECRET = "secret";

    const secretToken = "super-secret-bearer-token";
    const req = {
      method: "POST",
      originalUrl: "/api/auth/protected",
      ip: "10.0.0.8",
      headers: {
        origin: "https://app.example.com",
        authorization: `Bearer ${secretToken}`,
      },
      cookies: { token: "super-secret-cookie-value" },
      header: (name) =>
        name === "Authorization" ? `Bearer ${secretToken}` : undefined,
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    jwtVerifyMock.mockReturnValue({ id: "mongo-id" });

    await userAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalled();

    for (const call of loggerInfo.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain(secretToken);
      expect(serialized).not.toContain("super-secret-cookie-value");
      expect(serialized).not.toMatch(/Bearer\s+\S+/i);
    }

    const successCall = loggerInfo.mock.calls.find(
      ([message]) => message === "Auth middleware success",
    );
    expect(successCall).toBeTruthy();
    expect(successCall[1]).toMatchObject({
      method: "POST",
      url: "/api/auth/protected",
      ip: "10.0.0.8",
      origin: "https://app.example.com",
      hasAuthCookie: true,
      hasAuthorizationHeader: true,
      userId: "mongo-id",
    });

    process.env.NODE_ENV = previousEnv;
  });

  it("does not emit verbose auth info logs in production", async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.AUTH_PROVIDER = "legacy";
    process.env.JWT_SECRET = "secret";

    const req = {
      method: "GET",
      originalUrl: "/api/user/data",
      header: () => "Bearer prod-token",
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    jwtVerifyMock.mockReturnValue({ id: "mongo-id" });

    await userAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(loggerInfo).not.toHaveBeenCalled();

    process.env.NODE_ENV = previousEnv;
  });
});
