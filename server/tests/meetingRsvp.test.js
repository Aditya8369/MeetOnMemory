import mongoose from "mongoose";
import MeetingRsvp from "../models/meetingRsvpModel.js";
import Meeting from "../models/meetingModel.js";
import {
  initializeRsvps,
  updateRsvpStatus,
  getPendingRsvpsForUser,
  getMeetingRsvpSummary,
} from "../services/meetingRsvpService.js";
import { jest } from "@jest/globals";

describe("Meeting RSVP System", () => {
  let mockMeetingId;
  let mockOrganizerId;
  let mockParticipantId1;
  let mockParticipantId2;

  beforeEach(() => {
    mockMeetingId = new mongoose.Types.ObjectId().toString();
    mockOrganizerId = new mongoose.Types.ObjectId().toString();
    mockParticipantId1 = new mongoose.Types.ObjectId().toString();
    mockParticipantId2 = new mongoose.Types.ObjectId().toString();

    // Mock Mongoose models
    jest.spyOn(Meeting, "findById").mockResolvedValue({
      _id: mockMeetingId,
      uploadedBy: mockOrganizerId,
    });

    jest.spyOn(MeetingRsvp, "find").mockImplementation(() => {
      const queryObj = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
        then: function (resolve) {
          return resolve([]);
        },
      };
      return queryObj;
    });

    jest.spyOn(MeetingRsvp, "insertMany").mockResolvedValue([
      {
        meetingId: mockMeetingId,
        userId: mockParticipantId1,
        status: "pending",
      },
      {
        meetingId: mockMeetingId,
        userId: mockParticipantId2,
        status: "pending",
      },
    ]);

    jest
      .spyOn(MeetingRsvp, "findOneAndUpdate")
      .mockImplementation((query, update, _options) => {
        const mockResult = {
          meetingId: query.meetingId,
          userId: query.userId,
          status: update.$set.status || "pending",
          declineReason: update.$set.declineReason || "",
        };
        const queryObj = {
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockResult),
          then: function (resolve) {
            return resolve(mockResult);
          },
        };
        return queryObj;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("initializeRsvps", () => {
    it("should create new pending RSVPs for provided users", async () => {
      const userIds = [mockParticipantId1, mockParticipantId2];
      await initializeRsvps(mockMeetingId, userIds);

      expect(Meeting.findById).toHaveBeenCalledWith(mockMeetingId);
      expect(MeetingRsvp.insertMany).toHaveBeenCalledWith([
        {
          meetingId: mockMeetingId,
          userId: mockParticipantId1,
          status: "pending",
        },
        {
          meetingId: mockMeetingId,
          userId: mockParticipantId2,
          status: "pending",
        },
      ]);
    });
  });

  describe("updateRsvpStatus", () => {
    it("should update status to accepted", async () => {
      const updateData = { status: "accepted" };
      const result = await updateRsvpStatus(
        mockMeetingId,
        mockParticipantId1,
        updateData,
      );

      expect(MeetingRsvp.findOneAndUpdate).toHaveBeenCalledWith(
        { meetingId: mockMeetingId, userId: mockParticipantId1 },
        { $set: { status: "accepted" } },
        { new: true, upsert: true },
      );
      expect(result.status).toBe("accepted");
    });

    it("should throw an error for invalid status", async () => {
      const updateData = { status: "invalid_status" };
      await expect(
        updateRsvpStatus(mockMeetingId, mockParticipantId1, updateData),
      ).rejects.toThrow("Invalid RSVP status");
    });
  });

  describe("getPendingRsvpsForUser", () => {
    it("should fetch pending RSVPs for a given user", async () => {
      await getPendingRsvpsForUser(mockParticipantId1);

      expect(MeetingRsvp.find).toHaveBeenCalledWith({
        userId: mockParticipantId1,
        status: "pending",
      });
    });
  });

  describe("getMeetingRsvpSummary", () => {
    it("should calculate correct summary counts", async () => {
      jest.spyOn(MeetingRsvp, "find").mockImplementation(() => {
        const queryObj = {
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([
              { status: "accepted" },
              { status: "declined" },
              { status: "accepted" },
              { status: "pending" },
              { status: "tentative" },
            ]),
          then: function (resolve) {
            return resolve([
              { status: "accepted" },
              { status: "declined" },
              { status: "accepted" },
              { status: "pending" },
              { status: "tentative" },
            ]);
          },
        };
        return queryObj;
      });

      const summary = await getMeetingRsvpSummary(mockMeetingId);

      expect(summary.total).toBe(5);
      expect(summary.accepted).toBe(2);
      expect(summary.declined).toBe(1);
      expect(summary.tentative).toBe(1);
      expect(summary.pending).toBe(1);
    });
  });
});
