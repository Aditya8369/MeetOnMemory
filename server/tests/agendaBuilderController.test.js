// server/tests/agendaBuilderController.test.js
import Meeting from "../models/meetingModel.js";
import {
  checkMeetingOrgAccess,
  verifyMeetingOrgAccess,
  getAgendas,
  createAgendaItem,
  voteAgendaItem,
  reorderAgendaItems,
  finalizeAgenda,
} from "../controllers/agendaBuilderController.js";

describe("Agenda Builder Security & Access Control Tests (IDOR Defense)", () => {
  const orgA = "507f1f77bcf86cd799439011";
  const orgB = "507f1f77bcf86cd799439022";
  const userAId = "507f1f77bcf86cd799439033";
  const userBId = "507f1f77bcf86cd799439044";
  const validMeetingId = "507f1f77bcf86cd799439055";

  describe("checkMeetingOrgAccess Helper", () => {
    it("should allow access if user is direct uploader of the meeting", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userAId,
        organization: orgB,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(true);
    });

    it("should allow access if user belongs to meeting host organization", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userBId,
        organization: orgA,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(true);
    });

    it("should DENY access (403 IDOR defense) if user belongs to foreign organization", () => {
      const meeting = {
        _id: validMeetingId,
        uploadedBy: userBId,
        organization: orgB,
      };
      const user = { _id: userAId, organization: orgA };

      expect(checkMeetingOrgAccess(meeting, user)).toBe(false);
    });
  });

  describe("verifyMeetingOrgAccess Middleware", () => {
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

      await verifyMeetingOrgAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid meetingId format.",
        }),
      );
      expect(next).not.toHaveBeenCalled();
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

      await verifyMeetingOrgAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Meeting not found.",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 Forbidden if user attempts IDOR manipulation across organization boundaries", async () => {
      const foreignMeeting = {
        _id: validMeetingId,
        title: "Confidential Org B Meeting",
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

      await verifyMeetingOrgAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Unauthorized/i),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should attach meeting to req and call next() if access is authorized", async () => {
      const authorizedMeeting = {
        _id: validMeetingId,
        title: "Org A Sync",
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

      await verifyMeetingOrgAccess(req, res, next);

      expect(req.meeting).toBe(authorizedMeeting);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Agenda Builder Controller Handlers", () => {
    it("getAgendas should return meeting agenda items", async () => {
      const req = {
        meeting: {
          _id: validMeetingId,
          agendaItems: [{ text: "Item 1" }, { text: "Item 2" }],
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getAgendas(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          agendaItems: [{ text: "Item 1" }, { text: "Item 2" }],
        }),
      );
    });

    it("createAgendaItem should append new agenda item and save meeting", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const req = {
        user: { _id: userAId },
        meeting: {
          _id: validMeetingId,
          agendaItems: [],
          save: mockSave,
        },
        body: { text: "Discuss Q4 Budget" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createAgendaItem(req, res, jest.fn());

      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(req.meeting.agendaItems.length).toBe(1);
      expect(req.meeting.agendaItems[0].text).toBe("Discuss Q4 Budget");
    });
  });
});
