import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/EmailService.js", () => ({
  default: {
    sendMail: vi.fn().mockResolvedValue({ messageId: "msg-123" }),
  },
}));

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

vi.mock("date-fns-tz", () => ({
  formatInTimeZone: vi.fn().mockReturnValue("2026-08-24T12:00:00Z"),
}));

vi.mock("../utils/quietHours.js", () => ({
  checkQuietHours: vi.fn().mockResolvedValue(false),
}));

vi.mock("../models/meetingModel.js", () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../models/userModel.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../models/notificationPreferenceModel.js", () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("../models/actionItemModel.js", () => ({
  default: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../services/notificationService.js", () => ({
  createNotification: vi.fn().mockResolvedValue({ _id: "notif-1" }),
}));

import MeetingDigestService from "../services/MeetingDigestService.js";
import RecapEmailService from "../services/recapEmailService.js";
import ReminderScheduler from "../services/reminderScheduler.js";
import EmailService from "../services/EmailService.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import NotificationPreference from "../models/notificationPreferenceModel.js";

describe("Email Notification Preferences Enforcement (#2021)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips MeetingDigestService email when user opted out of email digests", async () => {
    Meeting.findById.mockResolvedValue({
      _id: "m-1",
      title: "Sync Meeting",
      date: new Date(),
      participants: [{ email: "user1@example.com" }],
    });

    User.find.mockResolvedValue([
      { _id: "u-1", email: "user1@example.com", emailDigestEnabled: true },
    ]);

    NotificationPreference.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          user: "u-1",
          emailWeeklyDigest: false,
          emailMeetingReminders: true,
        },
      ]),
    });

    const result = await MeetingDigestService.sendMeetingDigest("m-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("opted out");
    expect(EmailService.sendMail).not.toHaveBeenCalled();
  });

  it("sends MeetingDigestService email when user enabled email digests", async () => {
    Meeting.findById.mockResolvedValue({
      _id: "m-1",
      title: "Sync Meeting",
      date: new Date(),
      participants: [{ email: "user1@example.com" }],
    });

    User.find.mockResolvedValue([
      { _id: "u-1", email: "user1@example.com", emailDigestEnabled: true },
    ]);

    User.findOne.mockResolvedValue(null);

    NotificationPreference.find.mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([
          { user: "u-1", emailWeeklyDigest: true, emailMeetingReminders: true },
        ]),
    });

    const result = await MeetingDigestService.sendMeetingDigest("m-1");

    expect(result.success).toBe(true);
    expect(EmailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user1@example.com" }),
    );
  });

  it("skips immediate recap email when user opted out via isEmailUnsubscribed", async () => {
    NotificationPreference.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ emailMeetingReminders: false }),
    });

    const isUnsubscribed = await RecapEmailService.isEmailUnsubscribed(
      "u-1",
      "daily",
    );
    expect(isUnsubscribed).toBe(true);
  });

  it("skips meeting reminder email when emailMeetingReminders is false", async () => {
    const meeting = {
      _id: "m-2",
      title: "Standup",
      uploadedBy: { _id: "u-2", name: "Alice", email: "alice@example.com" },
      participants: [],
    };

    NotificationPreference.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ emailMeetingReminders: false }),
    });

    await ReminderScheduler.sendMeetingReminder(meeting, 10, new Date());

    expect(EmailService.sendMail).not.toHaveBeenCalled();
  });

  it("skips action item email when emailTaskAssignments is false", async () => {
    const item = {
      _id: "ai-1",
      title: "Fix Bug",
      assignee: { _id: "u-3", name: "Bob", email: "bob@example.com" },
    };

    NotificationPreference.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ emailTaskAssignments: false }),
    });

    await ReminderScheduler.sendReminder(item, "due_today");

    expect(EmailService.sendMail).not.toHaveBeenCalled();
  });
});
