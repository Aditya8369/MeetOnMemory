// server/tests/preMeetingBriefingController.test.js
import Meeting from "../models/meetingModel.js";
import {
  checkMeetingOrgAccess,
  generateBriefing,
  getBriefing,
} from "../controllers/preMeetingBriefingController.js";

describe("Pre-Meeting Briefing Controller Access Control Tests (IDOR Defense)", () => {
  const orgA = "507f1f77bcf86cd799439011";
  const orgB = "507f1f77bcf86cd799439022";
  const userAId = "507f1f77bcf86cd799439033";
  const userBId = "507f1f77bcf86cd799439044";
  const validMeetingId = "507f1f77bcf86cd799439055";

  describe("checkMeetingOrgAccess Helper", () => {
    it("should grant access if user is direct uploader of the meeting", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userAId,
        organization: orgB,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(true);
    });

    it("should grant access if user belongs to meeting host organization", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userBId,
        organization: orgA,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(true);
    });

    it("should DENY access (403 IDOR defense) if user belongs to a foreign organization", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userBId,
        organization: orgB,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(false);
    });
  });

  describe("generateBriefing Controller", () => {
    let originalFindById;

    beforeEach(() => {
      originalFindById = Meeting.findById;
    });

    afterEach(() => {
      Meeting.findById = originalFindById;
    });

    it("should return 400 Bad Request for invalid meetingId format", async () => {
      const req = {
        params: { meetingId: "invalid-id" },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await generateBriefing(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid meetingId format.",
        }),
      );
    });

    it("should return 404 Not Found if meeting does not exist", async () => {
      Meeting.findById = jest.fn().mockResolvedValue(null);

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await generateBriefing(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Meeting not found.",
        }),
      );
    });

    it("should return 403 Forbidden if user belongs to a foreign organization (IDOR defense)", async () => {
      const foreignMeeting = {
        _id: validMeetingId,
        title: "Confidential Strategy Meeting",
        organization: orgB,
        uploadedBy: userBId,
      };
      Meeting.findById = jest.fn().mockResolvedValue(foreignMeeting);

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA }, // User A attempting cross-tenant IDOR
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await generateBriefing(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Unauthorized/i),
        }),
      );
    });

    it("should return 201 Created with briefing package for authorized organization member", async () => {
      const authorizedMeeting = {
        _id: validMeetingId,
        title: "Sprint Planning",
        organization: orgA,
        uploadedBy: userBId,
        participants: [{ name: "Alice", email: "alice@org-a.com" }],
      };
      Meeting.findById = jest.fn().mockResolvedValue(authorizedMeeting);

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await generateBriefing(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          briefing: expect.objectContaining({
            title: "Sprint Planning",
          }),
        }),
      );
    });
  });

  describe("getBriefing Controller", () => {
    let originalFindById;

    beforeEach(() => {
      originalFindById = Meeting.findById;
    });

    afterEach(() => {
      Meeting.findById = originalFindById;
    });

    it("should return 403 Forbidden if user belongs to a foreign organization", async () => {
      const foreignMeeting = {
        _id: validMeetingId,
        title: "Confidential Org B Briefing",
        organization: orgB,
        uploadedBy: userBId,
      };
      Meeting.findById = jest.fn().mockResolvedValue(foreignMeeting);

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getBriefing(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Unauthorized/i),
        }),
      );
    });

    it("should return 200 OK with briefing for authorized user", async () => {
      const authorizedMeeting = {
        _id: validMeetingId,
        title: "Org A Weekly Sync",
        organization: orgA,
        uploadedBy: userBId,
      };
      Meeting.findById = jest.fn().mockResolvedValue(authorizedMeeting);

      const req = {
        params: { meetingId: validMeetingId },
        user: { _id: userAId, organization: orgA },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getBriefing(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          briefing: expect.objectContaining({
            title: "Org A Weekly Sync",
          }),
        }),
      );
    });
  });
});
