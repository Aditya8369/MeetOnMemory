// server/tests/recapStoryController.test.js
import { jest } from "@jest/globals";
import Meeting from "../models/meetingModel.js";
import {
  checkMeetingOrgAccess,
  getRecapStory,
} from "../controllers/recapStoryController.js";

describe("Recap Story Access Control Security Tests (IDOR Defense)", () => {
  const orgA = "507f1f77bcf86cd799439011";
  const orgB = "507f1f77bcf86cd799439022";
  const userAId = "507f1f77bcf86cd799439033";
  const userBId = "507f1f77bcf86cd799439044";
  const validMeetingId = "507f1f77bcf86cd799439055";

  describe("checkMeetingOrgAccess Helper Logic", () => {
    it("should allow access if user is direct uploader of the meeting", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userAId,
        organization: orgB, // Different org, but user is author
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(true);
    });

    it("should allow access if user belongs to host organization of meeting", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userBId,
        organization: orgA,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(true);
    });

    it("should DENY access (403 IDOR prevention) if user belongs to a foreign organization", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userBId,
        organization: orgB, // Confidential meeting from Organization B
      };
      const user = { _id: userAId, organization: orgA }; // User from Organization A

      expect(checkMeetingOrgAccess(meeting, user)).toBe(false);
    });

    it("should return false for missing meeting or user context", () => {
      expect(checkMeetingOrgAccess(null, { _id: userAId })).toBe(false);
      expect(checkMeetingOrgAccess({ organization: orgA }, null)).toBe(false);
    });
  });

  describe("getRecapStory Controller Method", () => {
    let originalFindById;

    beforeEach(() => {
      originalFindById = Meeting.findById;
    });

    afterEach(() => {
      Meeting.findById = originalFindById;
    });

    it("should reject invalid meetingId format with 400 Bad Request", async () => {
      const req = {
        params: { meetingId: "invalid-id-string" },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getRecapStory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid meetingId format.",
        }),
      );
    });

    it("should return 404 if meeting is not found", async () => {
      Meeting.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getRecapStory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Meeting not found.",
        }),
      );
    });

    it("should return 403 Forbidden if user tries to access meeting from another organization (IDOR Defense)", async () => {
      // Confidential meeting belonging to Organization B
      const confidentialMeeting = {
        _id: validMeetingId,
        title: "Confidential Board Meeting",
        organization: orgB,
        uploadedBy: userBId,
        summary: "Secret financial details",
      };

      Meeting.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(confidentialMeeting),
      });

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA }, // User from Org A attempting IDOR access
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getRecapStory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Access denied/i),
        }),
      );
    });

    it("should return 200 OK with recap story if user belongs to meeting host organization", async () => {
      const authorizedMeeting = {
        _id: validMeetingId,
        title: "Q3 Roadmap Sync",
        organization: orgA,
        uploadedBy: userBId,
        summary: "Roadmap priorities discussed",
        date: new Date(),
      };

      Meeting.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(authorizedMeeting),
      });

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA }, // User from Org A accessing Org A meeting
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getRecapStory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recapStory: expect.objectContaining({
            meetingId: validMeetingId,
            title: "Q3 Roadmap Sync",
            summary: "Roadmap priorities discussed",
          }),
        }),
      );
    });
  });
});
