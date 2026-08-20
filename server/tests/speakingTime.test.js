import {
  getBreakdownForMeeting,
  getTrendsForUser,
} from "../services/speakingTimeService.js";
import Transcript from "../models/transcriptModel.js";
import Meeting from "../models/meetingModel.js";
import mongoose from "mongoose";
import {
  getSpeakingTimeBreakdown,
  getSpeakingTimeTrends,
} from "../controllers/speakingTimeController.js";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

describe("Speaking Time Service", () => {
  let findOneSpy;
  let findSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    findOneSpy = jest.spyOn(Transcript, "findOne");
    findSpy = jest.spyOn(Meeting, "find");
  });

  describe("getBreakdownForMeeting", () => {
    it("should correctly compute speaking breakdown metrics", async () => {
      const mockMeetingId = new mongoose.Types.ObjectId();
      const mockSegments = [
        { speaker: "Alice", speakerId: "1", startTime: 0, endTime: 10 }, // duration: 10
        { speaker: "Bob", speakerId: "2", startTime: 10, endTime: 20 }, // duration: 10
        { speaker: "Alice", speakerId: "1", startTime: 15, endTime: 25 }, // duration: 10, overlap with Bob (15 < 20)
        { speaker: "Charlie", speakerId: "3", startTime: 25, endTime: 30 }, // duration: 5
      ];

      findOneSpy.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          meeting: mockMeetingId,
          segments: mockSegments,
        }),
      });

      const breakdown = await getBreakdownForMeeting(mockMeetingId);

      expect(breakdown.meetingSpan).toBe(30); // 30 - 0
      expect(breakdown.totalDuration).toBe(35); // 10 + 10 + 10 + 5
      expect(breakdown.participants).toHaveLength(3);

      const alice = breakdown.participants.find(
        (p) => p.speakerName === "Alice",
      );
      expect(alice.totalDuration).toBe(20);
      expect(alice.utteranceCount).toBe(2);
      expect(alice.longestUtterance).toBe(10);
      expect(alice.overlapCount).toBe(1); // 15 < 20

      const bob = breakdown.participants.find((p) => p.speakerName === "Bob");
      expect(bob.totalDuration).toBe(10);
      expect(bob.utteranceCount).toBe(1);
      expect(bob.overlapCount).toBe(0);

      const charlie = breakdown.participants.find(
        (p) => p.speakerName === "Charlie",
      );
      expect(charlie.totalDuration).toBe(5);
      expect(charlie.overlapCount).toBe(0);
    });

    it("should return zeros when transcript is missing", async () => {
      const mockMeetingId = new mongoose.Types.ObjectId();
      findOneSpy.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const breakdown = await getBreakdownForMeeting(mockMeetingId);

      expect(breakdown.meetingSpan).toBeUndefined();
      expect(breakdown.totalDuration).toBe(0);
      expect(breakdown.participants).toHaveLength(0);
    });

    it("should count overlap only if it belongs to a different speaker", async () => {
      const mockMeetingId = new mongoose.Types.ObjectId();
      const mockSegments = [
        { speaker: "Alice", speakerId: "1", startTime: 0, endTime: 10 },
        { speaker: "Alice", speakerId: "1", startTime: 8, endTime: 15 }, // same speaker overlap
        { speaker: "Bob", speakerId: "2", startTime: 12, endTime: 20 }, // different speaker overlap
      ];

      findOneSpy.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          meeting: mockMeetingId,
          segments: mockSegments,
        }),
      });

      const breakdown = await getBreakdownForMeeting(mockMeetingId);
      const alice = breakdown.participants.find(
        (p) => p.speakerName === "Alice",
      );
      const bob = breakdown.participants.find((p) => p.speakerName === "Bob");

      expect(alice.overlapCount).toBe(0); // same speaker overlap
      expect(bob.overlapCount).toBe(1); // different speaker overlap
    });
  });

  describe("getTrendsForUser", () => {
    it("should aggregate trends across meetings for a user", async () => {
      const mockUserId = "1";
      const mockMeeting1 = {
        _id: "m1",
        title: "Meeting 1",
        date: new Date("2026-08-01"),
        participants: [],
      };
      const mockMeeting2 = {
        _id: "m2",
        title: "Meeting 2",
        date: new Date("2026-08-02"),
        participants: [],
      };

      findSpy.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockMeeting1, mockMeeting2]),
      });

      findOneSpy.mockImplementation((query) => {
        if (query.meeting === "m1") {
          return {
            lean: jest.fn().mockResolvedValue({
              segments: [{ speakerId: "1", startTime: 0, endTime: 10 }],
            }),
          };
        } else if (query.meeting === "m2") {
          return {
            lean: jest.fn().mockResolvedValue({
              segments: [
                { speakerId: "1", startTime: 0, endTime: 20 },
                { speakerId: "2", startTime: 20, endTime: 40 },
              ],
            }),
          };
        }
      });

      const trends = await getTrendsForUser(mockUserId);

      expect(trends).toHaveLength(2);
      expect(trends[0].totalDuration).toBe(10); // Meeting 1 total duration for Alice
      expect(trends[0].talkRatio).toBe(100); // 10/10 * 100
      expect(trends[1].totalDuration).toBe(20); // Meeting 2 total duration for Alice
      expect(trends[1].talkRatio).toBe(50); // 20/40 * 100
    });

    it("should correctly resolve user-to-speaker match by name if speakerId is missing", async () => {
      const mockUserId = new mongoose.Types.ObjectId().toString();
      const mockMeeting1 = {
        _id: "m1",
        title: "Meeting 1",
        date: new Date("2026-08-01"),
        participants: [{ user: mockUserId, name: "Alice Smith" }],
      };

      findSpy.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockMeeting1]),
      });

      findOneSpy.mockImplementation(() => {
        return {
          lean: jest.fn().mockResolvedValue({
            segments: [
              {
                speaker: "Alice Smith",
                speakerId: null,
                startTime: 0,
                endTime: 10,
              },
            ],
          }),
        };
      });

      const trends = await getTrendsForUser(mockUserId);
      expect(trends).toHaveLength(1);
      expect(trends[0].totalDuration).toBe(10);
    });
  });
});

describe("Speaking Time Controller", () => {
  let req, res, jsonMock, statusMock, findByIdSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock };
    req = {
      user: { _id: "user1", organization: "org1" },
      params: {},
      query: {},
    };
    findByIdSpy = jest.spyOn(Meeting, "findById");
  });

  describe("getSpeakingTimeBreakdown", () => {
    it("should deny access if user is not owner, participant, or org member", async () => {
      req.params.meetingId = "m1";
      findByIdSpy.mockResolvedValue({
        _id: "m1",
        uploadedBy: "user2",
        participants: [{ user: "user3" }],
        organization: "org2",
      });

      await getSpeakingTimeBreakdown(req, res);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Access denied",
      });
    });

    it("should allow access if user is org member", async () => {
      req.params.meetingId = "m1";
      findByIdSpy.mockResolvedValue({
        _id: "m1",
        uploadedBy: "user2",
        participants: [{ user: "user3" }],
        organization: "org1",
      });
      // Mock the service call, so it doesn't fail
      jest
        .spyOn(Transcript, "findOne")
        .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await getSpeakingTimeBreakdown(req, res);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe("getSpeakingTimeTrends", () => {
    it("should clamp limit to maximum 50", async () => {
      req.query.limit = 100;
      jest.spyOn(Meeting, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await getSpeakingTimeTrends(req, res);

      expect(Meeting.find().limit).toHaveBeenCalledWith(50);
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});
