import mongoose from "mongoose";
import { vi, describe, beforeAll, beforeEach, it, expect } from "vitest";
import { checkQuietHours } from "../utils/quietHours.js";
import NotificationPreference from "../models/notificationPreferenceModel.js";
import MeetingDigestService from "../services/MeetingDigestService.js";
import reminderScheduler from "../services/reminderScheduler.js";
import EmailService from "../services/EmailService.js";
import emailService from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";

// Mock models and services
vi.mock("../models/notificationPreferenceModel.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("../services/EmailService.js", () => ({
  default: {
    sendMail: vi.fn(),
  },
}));

vi.mock("../services/emailService.js", () => ({
  default: {
    send: vi.fn(),
  },
}));

vi.mock("../services/notificationService.js", () => ({
  createNotification: vi.fn(),
}));

describe("Quiet Hours Enforcements (#2065)", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkQuietHours Utility", () => {
    it("returns false if user has no quiet hours configured", async () => {
      NotificationPreference.findOne.mockReturnValue({
        lean: () => null,
      });

      const res = await checkQuietHours(userId);
      expect(res).toBe(false);
    });

    it("returns true if date is within standard quiet hours (e.g. 22 to 6)", async () => {
      NotificationPreference.findOne.mockReturnValue({
        lean: () => ({
          quietHoursStart: 22,
          quietHoursEnd: 6,
          timezone: "UTC",
        }),
      });

      // 11 PM UTC
      const dateInHours = new Date("2026-08-23T23:00:00Z");
      const res = await checkQuietHours(userId, dateInHours);
      expect(res).toBe(true);
    });

    it("returns false if date is outside standard quiet hours", async () => {
      NotificationPreference.findOne.mockReturnValue({
        lean: () => ({
          quietHoursStart: 22,
          quietHoursEnd: 6,
          timezone: "UTC",
        }),
      });

      // 12 PM UTC
      const dateOutHours = new Date("2026-08-23T12:00:00Z");
      const res = await checkQuietHours(userId, dateOutHours);
      expect(res).toBe(false);
    });
  });

  describe("MeetingDigestService Quiet Hours Enforcer", () => {
    it("suppresses email sends if recipient quiet hours are active", async () => {
      const mockMeeting = {
        _id: "m1",
        title: "Test Meet",
        participants: [{ email: "test@domain.com", user: userId }],
      };

      // Mock user lookup and quiet hours
      const { default: User } = await import("../models/userModel.js");
      vi.spyOn(User, "findById").mockReturnValue({
        select: () => ({ email: "test@domain.com" }),
      });
      vi.spyOn(User, "find").mockResolvedValue([
        { _id: userId, email: "test@domain.com", emailDigestEnabled: true },
      ]);
      vi.spyOn(User, "findOne").mockResolvedValue({
        _id: userId,
        email: "test@domain.com",
      });

      NotificationPreference.findOne.mockReturnValue({
        lean: () => ({
          quietHoursStart: 22,
          quietHoursEnd: 6,
          timezone: "UTC",
        }),
      });

      // Override current time for test to 11 PM UTC
      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super("2026-08-23T23:00:00Z");
        }
      };

      const mockMeetingModel = await import("../models/meetingModel.js");
      vi.spyOn(mockMeetingModel.default, "findById").mockResolvedValue(
        mockMeeting,
      );

      const result = await MeetingDigestService.sendMeetingDigest("m1");
      expect(result.success).toBe(true);
      expect(EmailService.sendMail).not.toHaveBeenCalled();

      global.Date = originalDate;
    });
  });

  describe("ReminderScheduler Quiet Hours Enforcer", () => {
    it("suppresses reminders during active quiet hours", async () => {
      NotificationPreference.findOne.mockReturnValue({
        lean: () => ({
          quietHoursStart: 22,
          quietHoursEnd: 6,
          timezone: "UTC",
        }),
      });

      const mockMeeting = {
        _id: "m1",
        title: "Sync",
        uploadedBy: { _id: userId, name: "Alice", email: "alice@test.com" },
      };

      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super("2026-08-23T23:00:00Z");
        }
      };

      await reminderScheduler.sendMeetingReminder(
        mockMeeting,
        15,
        new Date("2026-08-23T23:15:00Z"),
      );

      // Verify notification and email are suppressed
      expect(createNotification).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();

      global.Date = originalDate;
    });
  });
});
