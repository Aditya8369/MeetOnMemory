import {
  generateSignedState,
  verifySignedState,
  sanitizeIntegration,
} from "../controllers/notionIntegrationController.js";

describe("Notion Integration Controller — Issue #1602", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const testSecret = "test-secret-key-123456";

  describe("OAuth State Signing & Verification", () => {
    it("should generate and verify a valid signed state", () => {
      const state = generateSignedState(validOrgId, testSecret);
      expect(typeof state).toBe("string");
      expect(state).toContain(".");

      const verification = verifySignedState(state, testSecret);
      expect(verification.valid).toBe(true);
      expect(verification.organizationId).toBe(validOrgId);
    });

    it("should reject tampered payload", () => {
      const state = generateSignedState(validOrgId, testSecret);
      const [payload, signature] = state.split(".");

      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf-8"),
      );
      decoded.organizationId = "507f1f77bcf86cd799439099";
      const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString(
        "base64url",
      );

      const verification = verifySignedState(
        `${tamperedPayload}.${signature}`,
        testSecret,
      );
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("tampered state detected");
    });

    it("should reject different secret", () => {
      const state = generateSignedState(validOrgId, "secret-a");
      expect(verifySignedState(state, "secret-b").valid).toBe(false);
    });

    it("should reject malformed/empty states", () => {
      expect(verifySignedState("invalid-state").valid).toBe(false);
      expect(verifySignedState("").valid).toBe(false);
      expect(verifySignedState(null).valid).toBe(false);
    });
  });

  describe("sanitizeIntegration", () => {
    it("should strip all token fields", () => {
      const sanitized = sanitizeIntegration({
        databaseId: "db-1",
        accessToken: "secret",
        token: "bearer",
        access_token: "oauth",
        botToken: "xoxb-123",
      });

      expect(sanitized.databaseId).toBe("db-1");
      expect(sanitized.accessToken).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.access_token).toBeUndefined();
      expect(sanitized.botToken).toBeUndefined();
    });

    it("should handle null input", () => {
      expect(sanitizeIntegration(null)).toBeNull();
    });

    it("should handle Mongoose documents via toObject()", () => {
      const doc = {
        toObject: () => ({
          _id: "123",
          accessToken: "secret",
          name: "Workspace",
        }),
      };
      const sanitized = sanitizeIntegration(doc);
      expect(sanitized._id).toBe("123");
      expect(sanitized.accessToken).toBeUndefined();
    });
  });

  describe("Controller Flow — initiateOAuth", () => {
    let initiateOAuth;
    beforeAll(async () => {
      ({ initiateOAuth } =
        await import("../controllers/notionIntegrationController.js"));
    });

    it("should return signed state for JSON requests", async () => {
      const req = {
        user: { organization: validOrgId },
        query: { redirect: "false" },
        headers: { accept: "application/json" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await initiateOAuth(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0];
      expect(data.success).toBe(true);
      expect(verifySignedState(data.state).valid).toBe(true);
    });

    it("should reject missing organization", async () => {
      const req = {
        user: {},
        query: {},
        headers: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await initiateOAuth(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Controller Flow — oauthCallback", () => {
    let oauthCallback;
    beforeAll(async () => {
      ({ oauthCallback } =
        await import("../controllers/notionIntegrationController.js"));
    });

    it("should reject invalid state", async () => {
      const req = {
        query: { code: "test_code", state: "tampered.bad" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await oauthCallback(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should reject missing code", async () => {
      const state = generateSignedState(validOrgId);
      const req = { query: { state } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await oauthCallback(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
