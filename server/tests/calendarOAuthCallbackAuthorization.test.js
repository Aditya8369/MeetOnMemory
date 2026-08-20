/**
 * Issue #1387 — Calendar OAuth callback handlers must bind credentials only
 * from verified signed state (never raw ?state=userId).
 */

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test_jwt_secret_calendar_oauth_1387";
process.env.CALENDAR_ENCRYPTION_KEY =
  process.env.CALENDAR_ENCRYPTION_KEY ||
  "test_encryption_key_32_bytes_long_xxxxxxxxx";

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import {
  createCalendarOAuthState,
  __resetCalendarOAuthStateStoreForTests,
} from "../utils/calendarOAuthState.js";

jest.unstable_mockModule("../models/calendarConnectionModel.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("../services/calendarService.js", () => ({
  getGoogleAuthUrl: jest.fn(
    (state) => `https://google.example/auth?state=${state}`,
  ),
  getMicrosoftAuthUrl: jest.fn(
    async (state) => `https://microsoft.example/auth?state=${state}`,
  ),
  getGoogleTokens: jest.fn(),
  getMicrosoftTokens: jest.fn(),
  encryptToken: jest.fn((t) => `enc:${t}`),
  getFreeBusy: jest.fn(),
  fetchExternalEvents: jest.fn(),
}));

jest.unstable_mockModule("../jobs/calendarSyncJob.js", () => ({
  triggerManualSync: jest.fn(),
}));

jest.unstable_mockModule("../utils/calendarOAuthRedirect.js", () => ({
  buildCalendarOAuthClientRedirect: (path) => `http://localhost:5173${path}`,
}));

const { handleGoogleCallback, handleMicrosoftCallback } =
  await import("../controllers/calendarController.js");
const { default: CalendarConnection } =
  await import("../models/calendarConnectionModel.js");
const { getGoogleTokens, getMicrosoftTokens, encryptToken } =
  await import("../services/calendarService.js");

const USER_A = new mongoose.Types.ObjectId().toString();
const USER_B = new mongoose.Types.ObjectId().toString();

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

describe("calendarController OAuth callbacks (#1387)", () => {
  beforeEach(() => {
    __resetCalendarOAuthStateStoreForTests();
    jest.clearAllMocks();
    getGoogleTokens.mockResolvedValue({
      access_token: "g-access",
      refresh_token: "g-refresh",
      expiry_date: Date.now() + 3600_000,
    });
    getMicrosoftTokens.mockResolvedValue({
      accessToken: "ms-access",
      refreshToken: "ms-refresh",
      expiresOn: 3600,
      account: { username: "user@example.com" },
    });
    CalendarConnection.findOne.mockResolvedValue(null);
    CalendarConnection.create.mockImplementation(async (doc) => ({
      ...doc,
      provider: doc.provider,
      syncStatus: doc.syncStatus,
      lastSyncAt: doc.lastSyncAt,
    }));
  });

  it("links Google credentials to the signed-state user (not a spoofed query userId)", async () => {
    const state = createCalendarOAuthState({
      userId: USER_A,
      provider: "google",
    });
    const req = {
      method: "GET",
      query: { code: "auth-code", state, userId: USER_B },
      user: null,
    };
    const res = mockRes();

    await handleGoogleCallback(req, res);

    expect(CalendarConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: USER_A,
        provider: "google",
      }),
    );
    expect(CalendarConnection.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ user: USER_B }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("sync=success"),
    );
  });

  it("links Microsoft credentials using signed state", async () => {
    const state = createCalendarOAuthState({
      userId: USER_A,
      provider: "microsoft",
    });
    const req = {
      method: "POST",
      body: { code: "ms-code", state },
      user: { _id: USER_A },
    };
    const res = mockRes();

    await handleMicrosoftCallback(req, res);

    expect(CalendarConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: USER_A,
        provider: "microsoft",
      }),
    );
    expect(encryptToken).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("rejects Google callback with raw userId as state (account takeover vector)", async () => {
    const req = {
      method: "POST",
      body: { code: "auth-code", state: USER_B },
      user: { _id: USER_A },
    };
    const res = mockRes();

    await handleGoogleCallback(req, res);

    expect(getGoogleTokens).not.toHaveBeenCalled();
    expect(CalendarConnection.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects replayed Google OAuth state before token exchange", async () => {
    const state = createCalendarOAuthState({
      userId: USER_A,
      provider: "google",
    });
    const req = {
      method: "POST",
      body: { code: "auth-code", state },
      user: { _id: USER_A },
    };

    const first = mockRes();
    await handleGoogleCallback(req, first);
    expect(first.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );

    const second = mockRes();
    await handleGoogleCallback(req, second);
    expect(getGoogleTokens).toHaveBeenCalledTimes(1);
    expect(second.status).toHaveBeenCalledWith(400);
    expect(second.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/already used|OAuth state/i),
      }),
    );
  });

  it("rejects Google state used on Microsoft callback (provider mismatch)", async () => {
    const state = createCalendarOAuthState({
      userId: USER_A,
      provider: "google",
    });
    const req = {
      method: "POST",
      body: { code: "ms-code", state },
      user: { _id: USER_A },
    };
    const res = mockRes();

    await handleMicrosoftCallback(req, res);

    expect(getMicrosoftTokens).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects POST callback when session user does not match state user", async () => {
    const state = createCalendarOAuthState({
      userId: USER_A,
      provider: "google",
    });
    const req = {
      method: "POST",
      body: { code: "auth-code", state },
      user: { _id: USER_B },
    };
    const res = mockRes();

    await handleGoogleCallback(req, res);

    expect(getGoogleTokens).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rejects missing state on Google callback", async () => {
    const req = {
      method: "POST",
      body: { code: "auth-code" },
      user: { _id: USER_A },
    };
    const res = mockRes();

    await handleGoogleCallback(req, res);

    expect(getGoogleTokens).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
