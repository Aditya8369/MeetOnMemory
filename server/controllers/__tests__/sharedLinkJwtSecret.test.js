import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSharedLinkJwtSecret } from "../sharedLinkController.js";

describe("Shared Link JWT Secret Configuration (#1675)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SHARED_LINK_JWT_SECRET;
    delete process.env.SHARED_LINK_SECRET;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws error when no JWT secret is configured", () => {
    expect(() => getSharedLinkJwtSecret()).toThrowError(
      "SHARED_LINK_JWT_SECRET is not configured",
    );
  });

  it("returns SHARED_LINK_JWT_SECRET when configured", () => {
    process.env.SHARED_LINK_JWT_SECRET = "custom_shared_link_secret_123";
    expect(getSharedLinkJwtSecret()).toBe("custom_shared_link_secret_123");
  });

  it("falls back to SHARED_LINK_SECRET when SHARED_LINK_JWT_SECRET is absent", () => {
    process.env.SHARED_LINK_SECRET = "fallback_shared_secret";
    expect(getSharedLinkJwtSecret()).toBe("fallback_shared_secret");
  });

  it("falls back to JWT_SECRET when other secrets are absent", () => {
    process.env.JWT_SECRET = "general_jwt_secret";
    expect(getSharedLinkJwtSecret()).toBe("general_jwt_secret");
  });
});
