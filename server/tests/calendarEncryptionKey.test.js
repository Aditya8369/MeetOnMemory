import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encrypt,
  decrypt,
  getTokenEncryptionKey,
} from "../services/calendarSyncService.js";
import { encryptToken, decryptToken } from "../services/calendarService.js";

const CONFIGURED_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HARDCODED_FALLBACK = "12345678901234567890123456789012";

describe("Calendar encryption key (#1768)", () => {
  const originalTokenKey = process.env.TOKEN_ENCRYPTION_KEY;
  const originalCalendarKey = process.env.CALENDAR_ENCRYPTION_KEY;

  const restoreEnv = () => {
    if (originalTokenKey === undefined) {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.TOKEN_ENCRYPTION_KEY = originalTokenKey;
    }
    if (originalCalendarKey === undefined) {
      delete process.env.CALENDAR_ENCRYPTION_KEY;
    } else {
      process.env.CALENDAR_ENCRYPTION_KEY = originalCalendarKey;
    }
  };

  beforeEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.CALENDAR_ENCRYPTION_KEY;
  });

  afterEach(() => {
    restoreEnv();
  });

  describe("calendarSyncService", () => {
    it("fails closed when TOKEN_ENCRYPTION_KEY is missing", () => {
      expect(() => getTokenEncryptionKey()).toThrowError(
        "TOKEN_ENCRYPTION_KEY is not configured",
      );
      expect(() => encrypt("google-oauth-token")).toThrowError(
        "TOKEN_ENCRYPTION_KEY is not configured",
      );
    });

    it("fails closed when TOKEN_ENCRYPTION_KEY is empty or whitespace", () => {
      process.env.TOKEN_ENCRYPTION_KEY = "";
      expect(() => getTokenEncryptionKey()).toThrowError(
        "TOKEN_ENCRYPTION_KEY is not configured",
      );

      process.env.TOKEN_ENCRYPTION_KEY = "   ";
      expect(() => getTokenEncryptionKey()).toThrowError(
        "TOKEN_ENCRYPTION_KEY is not configured",
      );
    });

    it("does not fall back to the previous hardcoded secret", () => {
      expect(() => encrypt("microsoft-oauth-token")).toThrowError(
        "TOKEN_ENCRYPTION_KEY is not configured",
      );
      expect(() => decrypt("iv:cipher:tag")).toThrowError(
        "TOKEN_ENCRYPTION_KEY is not configured",
      );
    });

    it("encrypts and decrypts when TOKEN_ENCRYPTION_KEY is configured", () => {
      process.env.TOKEN_ENCRYPTION_KEY = CONFIGURED_KEY;
      const plaintext = "ya29.google_access_token_example";

      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).not.toContain(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it("uses the configured key, not the retired hardcoded fallback", () => {
      process.env.TOKEN_ENCRYPTION_KEY = CONFIGURED_KEY;
      const encrypted = encrypt("outlook_refresh_token");

      process.env.TOKEN_ENCRYPTION_KEY = HARDCODED_FALLBACK;
      expect(() => decrypt(encrypted)).toThrow();
    });
  });

  describe("calendarService token helpers (Google / Microsoft)", () => {
    it("fails closed when neither calendar encryption key is configured", () => {
      expect(() => encryptToken("google_token")).toThrowError(
        "Calendar encryption key is not configured",
      );
      expect(() => decryptToken("ciphertext")).toThrowError(
        "Calendar encryption key is not configured",
      );
    });

    it("round-trips Google tokens when TOKEN_ENCRYPTION_KEY is set", () => {
      process.env.TOKEN_ENCRYPTION_KEY = CONFIGURED_KEY;
      const googleToken = "ya29.a0AfH6SMD_google_access_token";
      const encrypted = encryptToken(googleToken);
      expect(encrypted).not.toBe(googleToken);
      expect(decryptToken(encrypted)).toBe(googleToken);
    });

    it("round-trips Microsoft Outlook tokens when CALENDAR_ENCRYPTION_KEY is set", () => {
      process.env.CALENDAR_ENCRYPTION_KEY = CONFIGURED_KEY;
      const msToken = "EwBwA8l6BAAU-outlook_access_token";
      const encrypted = encryptToken(msToken);
      expect(encrypted).not.toBe(msToken);
      expect(decryptToken(encrypted)).toBe(msToken);
    });

    it("returns null for missing ciphertext without throwing", () => {
      process.env.TOKEN_ENCRYPTION_KEY = CONFIGURED_KEY;
      expect(decryptToken(null)).toBeNull();
      expect(decryptToken(undefined)).toBeNull();
    });
  });
});
