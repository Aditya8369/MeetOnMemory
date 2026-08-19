// server/tests/notionIntegrationController.test.js
import {
  generateSignedState,
  verifySignedState,
  sanitizeIntegration,
  initiateNotionOAuth,
  handleNotionCallback,
  saveMapping,
} from "../controllers/notionIntegrationController.js";

describe("Notion Integration Controller Security Tests", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const testSecret = "test-secret-key-123456";

  describe("OAuth State Cryptographic Signing & Verification", () => {
    it("should generate a valid signed state parameter containing organizationId", () => {
      const state = generateSignedState(validOrgId, testSecret);
      expect(typeof state).toBe("string");
      expect(state).toContain(".");

      const verification = verifySignedState(state, testSecret);
      expect(verification.valid).toBe(true);
      expect(verification.organizationId).toBe(validOrgId);
    });

    it("should reject tampered payload in state parameter", () => {
      const state = generateSignedState(validOrgId, testSecret);
      const [payload, signature] = state.split(".");

      // Decode payload, modify organizationId, re-encode
      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf-8"),
      );
      decoded.organizationId = "507f1f77bcf86cd799439099"; // Tampered Org ID
      const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString(
        "base64url",
      );

      const tamperedState = `${tamperedPayload}.${signature}`;
      const verification = verifySignedState(tamperedState, testSecret);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("tampered state detected");
    });

    it("should reject invalid signature with correct payload", () => {
      const state = generateSignedState(validOrgId, testSecret);
      const [payload] = state.split(".");
      const fakeSignature = "0".repeat(64);

      const tamperedState = `${payload}.${fakeSignature}`;
      const verification = verifySignedState(tamperedState, testSecret);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("tampered state detected");
    });

    it("should reject state signed with a different secret", () => {
      const state = generateSignedState(validOrgId, "secret-a");
      const verification = verifySignedState(state, "secret-b");

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("tampered state detected");
    });

    it("should reject malformed or empty state strings", () => {
      expect(verifySignedState("invalid-state").valid).toBe(false);
      expect(verifySignedState("").valid).toBe(false);
      expect(verifySignedState(null).valid).toBe(false);
    });
  });

  describe("Credential Leakage Prevention in saveMapping", () => {
    it("should sanitize integration object and remove accessToken", () => {
      const rawIntegration = {
        databaseId: "notion-db-999",
        mapping: { title: "Name" },
        accessToken: "secret_notion_access_token_abc123",
        token: "bearer_token_xyz",
        access_token: "oauth_access_token",
        botToken: "xoxb-12345",
      };

      const sanitized = sanitizeIntegration(rawIntegration);

      expect(sanitized.databaseId).toBe("notion-db-999");
      expect(sanitized.mapping).toEqual({ title: "Name" });
      expect(sanitized.accessToken).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.access_token).toBeUndefined();
      expect(sanitized.botToken).toBeUndefined();
    });

    it("saveMapping controller response must exclude accessToken field", async () => {
      const req = {
        body: {
          organizationId: validOrgId,
          databaseId: "notion-db-100",
          accessToken: "super_secret_token",
          integration: {
            databaseId: "notion-db-100",
            accessToken: "super_secret_token",
            mapping: { title: "Title" },
          },
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await saveMapping(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          integration: expect.not.objectContaining({
            accessToken: "super_secret_token",
          }),
        }),
      );

      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.integration.accessToken).toBeUndefined();
    });
  });

  describe("Controller Flow Tests", () => {
    it("initiateNotionOAuth should generate signed state and respond", async () => {
      const req = {
        query: { organizationId: validOrgId, redirect: "false" },
        headers: { accept: "application/json" },
        session: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await initiateNotionOAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.state).toBeDefined();

      // Verify the generated state is valid and signed
      const verification = verifySignedState(responseData.state);
      expect(verification.valid).toBe(true);
      expect(verification.organizationId).toBe(validOrgId);
    });

    it("handleNotionCallback should reject invalid or tampered state", async () => {
      const req = {
        query: {
          code: "test_oauth_code",
          state: "tampered.invalid_signature",
        },
        session: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await handleNotionCallback(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Invalid.*OAuth state|tampered/i),
        }),
      );
    });
  });
});
