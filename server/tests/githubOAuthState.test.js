// server/tests/githubOAuthState.test.js
import express from "express";
import supertest from "supertest";
import {
  generateSignedState,
  verifySignedState,
  initiateOAuth,
  handleCallback,
} from "../controllers/githubIntegrationController.js";

// Mock models and dependencies
jest.mock("../models/githubIntegrationModel.js", () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue(true),
}));
jest.mock("../utils/crypto.js", () => ({
  encryptToken: jest.fn().mockReturnValue("encrypted_token"),
  decryptToken: jest.fn().mockReturnValue("decrypted_token"),
}));
jest.mock("axios", () => ({
  post: jest
    .fn()
    .mockResolvedValue({ data: { access_token: "gho_mock_access_token_123" } }),
}));

describe("GitHub OAuth State Parameter Signing Security Tests (#1808)", () => {
  let app;
  const mockOrgId = "507f1f77bcf86cd799439011";

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.get(
      "/auth",
      (req, res, next) => {
        req.user = { _id: "user-1", organization: mockOrgId };
        next();
      },
      initiateOAuth,
    );
    app.get(
      "/callback",
      (req, res, next) => {
        req.user = { _id: "user-1", organization: mockOrgId };
        next();
      },
      handleCallback,
    );

    process.env.GITHUB_CLIENT_ID = "mock_client_id";
    process.env.GITHUB_CLIENT_SECRET = "mock_client_secret";
  });

  it("generateSignedState should return signed state formatted as data.signature", () => {
    const stateToken = generateSignedState({ organizationId: mockOrgId });

    expect(typeof stateToken).toBe("string");
    expect(stateToken).toContain(".");
  });

  it("verifySignedState should verify valid signed state token", () => {
    const stateToken = generateSignedState({ organizationId: mockOrgId });
    const decoded = verifySignedState(stateToken);

    expect(decoded).not.toBeNull();
    expect(decoded.organizationId).toBe(mockOrgId);
  });

  it("verifySignedState should reject unsigned raw Base64 state parameter", () => {
    // Attack vector: raw Base64 string containing organizationId
    const forgedState = Buffer.from(
      JSON.stringify({ organizationId: mockOrgId }),
    ).toString("base64");
    const decoded = verifySignedState(forgedState);

    expect(decoded).toBeNull();
  });

  it("GET /callback with forged unsigned Base64 state should return HTTP 400 Bad Request", async () => {
    const forgedState = Buffer.from(
      JSON.stringify({ organizationId: mockOrgId }),
    ).toString("base64");

    const res = await supertest(app).get(
      `/callback?code=mock_code&state=${forgedState}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Invalid or tampered state parameter");
  });

  it("GET /callback with valid signed state should succeed and redirect", async () => {
    const validState = generateSignedState({ organizationId: mockOrgId });

    const res = await supertest(app).get(
      `/callback?code=mock_code&state=${validState}`,
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("github_success=true");
  });
});
