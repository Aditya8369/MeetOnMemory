import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { google } from "googleapis";
import CalendarConnection from "../models/calendarConnectionModel.js";
import {
  syncMeetingToGoogle,
  syncMeetingToOutlook,
  pushMeetingToIntegrations,
  suggestFreeSlot,
  initCalendarSyncCron,
} from "../services/calendarSyncService.js";

// Mock axios
vi.mock("axios", () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { id: "outlook_event_123" } }),
    patch: vi.fn().mockResolvedValue({ data: { id: "outlook_event_123" } }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

// Mock googleapis
vi.mock("googleapis", () => {
  const mockCalendar = {
    events: {
      update: vi.fn().mockResolvedValue({}),
      insert: vi.fn().mockResolvedValue({ data: { id: "google_event_123" } }),
      delete: vi.fn().mockResolvedValue({}),
    },
    freebusy: {
      query: vi.fn().mockResolvedValue({
        data: {
          calendars: {
            primary: { busy: [] },
          },
        },
      }),
    },
  };
  return {
    google: {
      calendar: vi.fn(() => mockCalendar),
      auth: {
        OAuth2: vi.fn().mockImplementation(function () {
          return {
            setCredentials: vi.fn(),
            refreshAccessToken: vi.fn().mockResolvedValue({
              credentials: {
                access_token: "new_google_access_token",
                expiry_date: Date.now() + 3600 * 1000,
              },
            }),
          };
        }),
      },
    },
  };
});

// Mock calendarService helpers
vi.mock("../services/calendarService.js", () => ({
  encryptToken: vi.fn((token) => `enc:${token}`),
  decryptToken: vi.fn((token) => (token ? token.replace(/^enc:/, "") : null)),
  getGoogleOAuthClient: vi.fn().mockImplementation(() => {
    return new google.auth.OAuth2();
  }),
}));

describe("Calendar Connection model and Sync service integration", () => {
  const dummyUserId = new mongoose.Types.ObjectId();
  let googleConnection;
  let outlookConnection;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock CalendarConnection database helper functions
    googleConnection = {
      user: dummyUserId,
      provider: "google",
      accessToken: "enc:google_access_123",
      refreshToken: "enc:google_refresh_123",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      syncStatus: "connected",
      lastSyncAt: null,
      providerData: { calendarId: "primary" },
      save: vi.fn().mockResolvedValue(true),
    };

    outlookConnection = {
      user: dummyUserId,
      provider: "outlook",
      accessToken: "enc:outlook_access_123",
      refreshToken: "enc:outlook_refresh_123",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      syncStatus: "connected",
      lastSyncAt: null,
      providerData: {},
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(CalendarConnection, "find").mockImplementation(async (query) => {
      const results = [];
      if (query.user?.toString() === dummyUserId.toString()) {
        if (query.syncStatus === "connected" || !query.syncStatus) {
          results.push(googleConnection);
          results.push(outlookConnection);
        }
      }
      return results;
    });
  });

  it("should successfully sync meeting to Google Calendar", async () => {
    const meeting = {
      title: "Google Test Sync",
      description: "Sync details",
      date: new Date(),
      duration: 60,
      venue: "Zoom",
      externalCalendarRefs: [],
    };

    const ref = await syncMeetingToGoogle(googleConnection, meeting);
    expect(ref).toEqual({ provider: "google", eventId: "google_event_123" });
  });

  it("should successfully sync meeting to Outlook Calendar", async () => {
    const meeting = {
      title: "Outlook Test Sync",
      description: "Sync details",
      date: new Date(),
      duration: 30,
      location: "Teams",
      externalCalendarRefs: [],
    };

    const ref = await syncMeetingToOutlook(outlookConnection, meeting);
    expect(ref).toEqual({ provider: "outlook", eventId: "outlook_event_123" });
  });

  it("should find and push meetings to active calendar connections", async () => {
    const meeting = {
      title: "Joint Meeting",
      description: "Push test",
      date: new Date(),
      duration: 45,
      externalCalendarRefs: [],
      save: vi.fn().mockResolvedValue(true),
    };

    await pushMeetingToIntegrations(dummyUserId, meeting);

    expect(meeting.save).toHaveBeenCalled();
    expect(meeting.externalCalendarRefs).toContainEqual(
      expect.objectContaining({ provider: "google" }),
    );
    expect(meeting.externalCalendarRefs).toContainEqual(
      expect.objectContaining({ provider: "outlook" }),
    );
  });

  it("should suggest a free slot based on google calendar freebusy checks", async () => {
    const targetDate = new Date();
    const result = await suggestFreeSlot(
      dummyUserId,
      targetDate.toISOString(),
      30,
    );
    expect(result).toBeDefined();
    expect(new Date(result).getTime()).toBeGreaterThanOrEqual(
      targetDate.getTime(),
    );
  });

  it("should identify expiring connections and trigger OAuth refresh in reconciliation cron", async () => {
    // Modify googleConnection to look expiring (expires in 10 minutes)
    googleConnection.tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    vi.spyOn(CalendarConnection, "find").mockResolvedValue([googleConnection]);

    // Track cron registration
    let cronCallback;
    vi.mock("node-cron", () => ({
      default: {
        schedule: vi.fn((pattern, cb) => {
          cronCallback = cb;
        }),
      },
    }));

    initCalendarSyncCron();

    expect(cronCallback).toBeDefined();

    // Trigger reconciliation job
    await cronCallback();

    expect(googleConnection.save).toHaveBeenCalled();
    expect(googleConnection.syncStatus).toBe("connected");
  });
});
