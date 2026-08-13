/**
 * Issue #1387 — Signed calendar OAuth state utility unit tests.
 */

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test_jwt_secret_calendar_oauth_1387";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  createCalendarOAuthState,
  verifyAndConsumeCalendarOAuthState,
  CalendarOAuthStateError,
  __resetCalendarOAuthStateStoreForTests,
} from "../utils/calendarOAuthState.js";

const USER_A = new mongoose.Types.ObjectId().toString();
const USER_B = new mongoose.Types.ObjectId().toString();

describe("calendarOAuthState (#1387)", () => {
  beforeEach(() => {
    __resetCalendarOAuthStateStoreForTests();
  });

  describe("create + verify happy paths", () => {
    it("accepts a valid Google OAuth state", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "google",
      });

      const claims = await verifyAndConsumeCalendarOAuthState(state, {
        expectedProvider: "google",
      });

      expect(claims.userId).toBe(USER_A);
      expect(claims.provider).toBe("google");
      expect(claims.jti).toBeTruthy();
    });

    it("accepts a valid Microsoft OAuth state", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "microsoft",
      });

      const claims = await verifyAndConsumeCalendarOAuthState(state, {
        expectedProvider: "microsoft",
      });

      expect(claims.userId).toBe(USER_A);
      expect(claims.provider).toBe("microsoft");
    });

    it("normalizes outlook provider to microsoft", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "outlook",
      });

      const claims = await verifyAndConsumeCalendarOAuthState(state, {
        expectedProvider: "outlook",
      });

      expect(claims.provider).toBe("microsoft");
    });
  });

  describe("security failures", () => {
    it("rejects missing state", async () => {
      await expect(
        verifyAndConsumeCalendarOAuthState(undefined, {
          expectedProvider: "google",
        }),
      ).rejects.toMatchObject({
        code: "missing",
        status: 400,
      });
    });

    it("rejects an invalid signature", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "google",
      });
      const tampered = `${state.slice(0, -4)}xxxx`;

      await expect(
        verifyAndConsumeCalendarOAuthState(tampered, {
          expectedProvider: "google",
        }),
      ).rejects.toMatchObject({ code: "invalid" });
    });

    it("rejects a modified payload (userId swap)", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "google",
      });
      const parts = state.split(".");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      payload.userId = USER_B;
      parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const modified = parts.join(".");

      await expect(
        verifyAndConsumeCalendarOAuthState(modified, {
          expectedProvider: "google",
        }),
      ).rejects.toMatchObject({ code: "invalid" });
    });

    it("rejects an expired state", async () => {
      const expired = jwt.sign(
        {
          purpose: "calendar_oauth",
          userId: USER_A,
          provider: "google",
          jti: "expired-nonce",
        },
        process.env.JWT_SECRET,
        { expiresIn: -10 },
      );

      await expect(
        verifyAndConsumeCalendarOAuthState(expired, {
          expectedProvider: "google",
        }),
      ).rejects.toMatchObject({ code: "expired" });
    });

    it("rejects replayed state (single-use)", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "google",
      });

      await verifyAndConsumeCalendarOAuthState(state, {
        expectedProvider: "google",
      });

      await expect(
        verifyAndConsumeCalendarOAuthState(state, {
          expectedProvider: "google",
        }),
      ).rejects.toMatchObject({ code: "replay" });
    });

    it("rejects provider mismatch", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "google",
      });

      await expect(
        verifyAndConsumeCalendarOAuthState(state, {
          expectedProvider: "microsoft",
        }),
      ).rejects.toMatchObject({ code: "provider_mismatch" });
    });

    it("rejects user mismatch when session user is provided", async () => {
      const state = createCalendarOAuthState({
        userId: USER_A,
        provider: "google",
      });

      await expect(
        verifyAndConsumeCalendarOAuthState(state, {
          expectedProvider: "google",
          expectedUserId: USER_B,
        }),
      ).rejects.toMatchObject({
        code: "user_mismatch",
        status: 403,
      });
    });

    it("does not treat a raw userId string as valid state", async () => {
      await expect(
        verifyAndConsumeCalendarOAuthState(USER_A, {
          expectedProvider: "google",
        }),
      ).rejects.toBeInstanceOf(CalendarOAuthStateError);
    });
  });
});
