import {
  submitFeedback,
  getAggregateFeedback,
  deleteFeedback,
  getFeedbackForMeeting,
  getUserFeedbackForMeeting,
} from "../controllers/meetingFeedbackController.js";
import MeetingFeedback from "../models/meetingFeedbackModel.js";
import Meeting from "../models/meetingModel.js";
import { jest } from "@jest/globals";
import mongoose from "mongoose";

describe("Meeting Feedback Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: {
        _id: new mongoose.Types.ObjectId().toString(),
        organization: new mongoose.Types.ObjectId().toString(),
      },
      app: {
        get: jest.fn().mockReturnValue({
          to: jest.fn().mockReturnValue({
            emit: jest.fn(),
          }),
        }),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe("submitFeedback", () => {
    it("should validate input and save feedback for a participant", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.body = {
        meetingId,
        overallRating: 5,
        summaryAccuracy: 4,
        transcriptQuality: 4,
        comment: "Great",
      };

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        participants: [{ user: req.user._id }],
      });

      jest.spyOn(MeetingFeedback, "findOneAndUpdate").mockResolvedValue({
        ...req.body,
        _id: "feedbackId",
      });

      await submitFeedback(req, res, next);

      expect(MeetingFeedback.findOneAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("should fail if user is not a participant", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.body = {
        meetingId,
        overallRating: 5,
        summaryAccuracy: 5,
        transcriptQuality: 5,
      };

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        participants: [],
      });

      await submitFeedback(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("should fail if meeting belongs to a different organization", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.body = {
        meetingId,
        overallRating: 5,
        summaryAccuracy: 5,
        transcriptQuality: 5,
      };

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        organization: new mongoose.Types.ObjectId().toString(), // different org
        participants: [{ user: req.user._id }],
      });

      await submitFeedback(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Forbidden: Meeting belongs to another organization",
        }),
      );
    });

    it("should return 400 for invalid meeting ID", async () => {
      req.body = {
        meetingId: "invalid-id",
        overallRating: 5,
        summaryAccuracy: 5,
        transcriptQuality: 5,
      };

      await submitFeedback(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid meeting ID",
        }),
      );
    });
  });

  describe("getAggregateFeedback", () => {
    it("should return aggregated feedback data grouped by month", async () => {
      const orgId = req.user.organization;
      req.params.orgId = orgId;

      jest.spyOn(MeetingFeedback, "aggregate").mockResolvedValue([
        {
          _id: { year: 2026, month: 7 },
          avgOverall: 4.5,
          avgSummary: 4.0,
          avgTranscript: 4.8,
          count: 10,
        },
      ]);

      await getAggregateFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [
            {
              month: "Jul 2026",
              overall: 4.5,
              summary: 4,
              transcript: 4.8,
              count: 10,
            },
          ],
        }),
      );
    });
  });

  describe("getFeedbackForMeeting", () => {
    it("returns 403 when the user is neither owner nor participant", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        participants: [],
      });
      const findSpy = jest.spyOn(MeetingFeedback, "find");

      await getFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
      // Must not query/leak feedback for an unauthorized user.
      expect(findSpy).not.toHaveBeenCalled();
    });

    it("returns 403 when the meeting belongs to a different organization", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        organization: new mongoose.Types.ObjectId().toString(), // different org
        participants: [{ user: req.user._id }],
      });
      const findSpy = jest.spyOn(MeetingFeedback, "find");

      await getFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Forbidden: Meeting belongs to another organization",
        }),
      );
      expect(findSpy).not.toHaveBeenCalled();
    });

    it("returns 404 when the meeting does not exist", async () => {
      req.params.meetingId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Meeting, "findById").mockResolvedValue(null);

      await getFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns feedback for a participant", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        participants: [{ user: req.user._id }],
      });
      jest.spyOn(MeetingFeedback, "find").mockReturnValue({
        populate: jest
          .fn()
          .mockResolvedValue([{ _id: "f1", overallRating: 5 }]),
      });

      await getFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe("getUserFeedbackForMeeting", () => {
    it("returns user feedback when found and authorized", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: req.user._id,
        participants: [],
      });

      jest.spyOn(MeetingFeedback, "findOne").mockResolvedValue({
        _id: "f1",
        meetingId,
        userId: req.user._id,
        overallRating: 4,
      });

      await getUserFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          feedback: expect.objectContaining({ overallRating: 4 }),
        }),
      );
    });

    it("returns 404 if meeting does not exist", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue(null);

      await getUserFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 if meeting belongs to a different organization", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        organization: new mongoose.Types.ObjectId().toString(),
        participants: [{ user: req.user._id }],
      });

      await getUserFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Forbidden: Meeting belongs to another organization",
        }),
      );
    });

    it("returns 403 if user is not participant or owner", async () => {
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.meetingId = meetingId;

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        uploadedBy: new mongoose.Types.ObjectId().toString(),
        participants: [],
      });

      await getUserFeedbackForMeeting(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("deleteFeedback", () => {
    it("should delete feedback if owned by user and authorized", async () => {
      const feedbackId = new mongoose.Types.ObjectId().toString();
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.id = feedbackId;

      const mockDeleteOne = jest.fn();
      jest.spyOn(MeetingFeedback, "findById").mockResolvedValue({
        _id: feedbackId,
        meetingId,
        userId: req.user._id,
        deleteOne: mockDeleteOne,
      });

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        organization: req.user.organization,
      });

      await deleteFeedback(req, res);

      expect(mockDeleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should fail to delete if the associated meeting belongs to a different organization", async () => {
      const feedbackId = new mongoose.Types.ObjectId().toString();
      const meetingId = new mongoose.Types.ObjectId().toString();
      req.params.id = feedbackId;

      jest.spyOn(MeetingFeedback, "findById").mockResolvedValue({
        _id: feedbackId,
        meetingId,
        userId: req.user._id,
      });

      jest.spyOn(Meeting, "findById").mockResolvedValue({
        _id: meetingId,
        organization: new mongoose.Types.ObjectId().toString(),
      });

      await deleteFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Forbidden: Meeting belongs to another organization",
        }),
      );
    });
  });
});
