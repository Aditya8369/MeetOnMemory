import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  verifyMeetingAccess,
  verifyActionItemAccess,
} from "../middleware/meetingAuth.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";

vi.mock("../models/meetingModel.js");
vi.mock("../models/actionItemModel.js");

describe("meetingAuth Middleware - Organization Authorization (#1665)", () => {
  let req, res, next;
  const org1Id = new mongoose.Types.ObjectId();
  const org2Id = new mongoose.Types.ObjectId();
  const user1Id = new mongoose.Types.ObjectId();
  const user2Id = new mongoose.Types.ObjectId();
  const meetingId = new mongoose.Types.ObjectId();
  const actionItemId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: {},
      user: {
        _id: user1Id,
        organization: org1Id,
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe("verifyMeetingAccess", () => {
    it("allows access when user and meeting belong to the same organization", async () => {
      req.params.meetingId = meetingId.toString();
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: user2Id,
        organization: org1Id,
      });

      await verifyMeetingAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.meeting).toBeDefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies access when user and meeting belong to different organizations", async () => {
      req.params.meetingId = meetingId.toString();
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: user2Id,
        organization: org2Id,
      });

      await verifyMeetingAccess(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Unauthorized access to meeting" }),
      );
    });

    it("allows access if the user is the meeting owner even without same organization", async () => {
      req.params.meetingId = meetingId.toString();
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: user1Id, // Owner
        organization: null,
      });

      await verifyMeetingAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.meeting).toBeDefined();
    });

    it("fails closed when meeting organization is missing and user is not owner", async () => {
      req.params.meetingId = meetingId.toString();
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: user2Id,
        organization: null, // missing organization
      });

      await verifyMeetingAccess(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("fails closed when user organization is missing and user is not owner", async () => {
      req.params.meetingId = meetingId.toString();
      req.user.organization = null;
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: user2Id,
        organization: org1Id,
      });

      await verifyMeetingAccess(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when meeting is not found", async () => {
      req.params.meetingId = meetingId.toString();
      Meeting.findById.mockResolvedValue(null);

      await verifyMeetingAccess(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("verifyActionItemAccess", () => {
    it("allows access when user and action item source meeting belong to the same organization", async () => {
      req.params.id = actionItemId.toString();
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
      };
      // second populate returns the doc
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        _id: actionItemId,
        sourceMeetingId: {
          _id: meetingId,
          uploadedBy: user2Id,
          organization: org1Id,
        },
      });
      ActionItem.findById = vi.fn().mockReturnValue(mockQuery);

      await verifyActionItemAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.actionItem).toBeDefined();
    });

    it("denies access when user and action item belong to different organizations", async () => {
      req.params.id = actionItemId.toString();
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        _id: actionItemId,
        sourceMeetingId: {
          _id: meetingId,
          uploadedBy: user2Id,
          organization: org2Id,
        },
      });
      ActionItem.findById = vi.fn().mockReturnValue(mockQuery);

      await verifyActionItemAccess(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("fails closed when organization data is missing on action item and not owner", async () => {
      req.params.id = actionItemId.toString();
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        _id: actionItemId,
        sourceMeetingId: {
          _id: meetingId,
          uploadedBy: user2Id,
          organization: null,
        },
      });
      ActionItem.findById = vi.fn().mockReturnValue(mockQuery);

      await verifyActionItemAccess(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
