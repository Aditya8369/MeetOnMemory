import { expect, jest, describe, beforeEach, it } from "@jest/globals";
import mongoose from "mongoose";
import KeywordAlert from "../models/keywordAlertModel.js";
import { scanTranscriptForKeywords } from "../services/keywordAlertService.js";
import * as notificationService from "../services/notificationService.js";
import EmailService from "../services/EmailService.js";

describe.skip("KeywordAlertService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(notificationService, "createNotifications")
      .mockResolvedValue([]);
    jest.spyOn(EmailService, "sendMail").mockResolvedValue(true);
  });

  describe("scanTranscriptForKeywords", () => {
    it("should do nothing if transcript is empty", async () => {
      await scanTranscriptForKeywords(
        {
          _id: new mongoose.Types.ObjectId(),
          organization: new mongoose.Types.ObjectId(),
        },
        "",
      );
      expect(notificationService.createNotifications).not.toHaveBeenCalled();
    });

    it("should do nothing if there are no active alerts", async () => {
      const orgId = new mongoose.Types.ObjectId();
      const meetingId = new mongoose.Types.ObjectId();

      // Mock KeywordAlert.find to return empty array
      jest.spyOn(KeywordAlert, "find").mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await scanTranscriptForKeywords(
        { _id: meetingId, organization: orgId, title: "Test" },
        "some text",
      );

      expect(notificationService.createNotifications).not.toHaveBeenCalled();
      KeywordAlert.find.mockRestore();
    });

    it("should match keywords case-insensitively and dispatch notifications", async () => {
      const orgId = new mongoose.Types.ObjectId();
      const meetingId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const mockAlerts = [
        {
          organization: orgId,
          isActive: true,
          notifyViaApp: true,
          notifyViaEmail: true,
          keywords: ["Project Titan", "budget cuts"],
          user: { _id: userId, name: "Test User", email: "test@example.com" },
        },
      ];

      jest.spyOn(KeywordAlert, "find").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAlerts),
      });

      const transcript =
        "In today's meeting we discussed PROJECT TITAN and other matters. However, budget cuts were not on the agenda.";

      await scanTranscriptForKeywords(
        { _id: meetingId, organization: orgId, title: "Test Meeting" },
        transcript,
      );

      // Verify app notification
      expect(notificationService.createNotifications).toHaveBeenCalledTimes(1);
      expect(notificationService.createNotifications).toHaveBeenCalledWith(
        [userId.toString()],
        expect.objectContaining({
          title: "Keyword Alert",
          description: expect.stringContaining("Project Titan, budget cuts"),
          category: "system",
        }),
      );

      // Verify email notification
      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(EmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "MeetOnMemory: Keyword Alert - Test Meeting",
          html: expect.stringContaining("Project Titan, budget cuts"),
        }),
      );

      KeywordAlert.find.mockRestore();
    });

    it("should only send email if notifyViaApp is false", async () => {
      const orgId = new mongoose.Types.ObjectId();
      const meetingId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const mockAlerts = [
        {
          organization: orgId,
          isActive: true,
          notifyViaApp: false,
          notifyViaEmail: true,
          keywords: ["secret"],
          user: { _id: userId, name: "Test User", email: "test@example.com" },
        },
      ];

      jest.spyOn(KeywordAlert, "find").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAlerts),
      });

      await scanTranscriptForKeywords(
        { _id: meetingId, organization: orgId, title: "Test Meeting" },
        "This is a secret.",
      );

      expect(notificationService.createNotifications).not.toHaveBeenCalled();
      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);

      KeywordAlert.find.mockRestore();
    });
  });
});
