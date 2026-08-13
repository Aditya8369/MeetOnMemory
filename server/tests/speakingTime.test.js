import {
  getBreakdownForMeeting,
  getTrendsForUser,
} from "../services/speakingTimeService.js";
import Transcript from "../models/transcriptModel.js";
import Meeting from "../models/meetingModel.js";
import mongoose from "mongoose";
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

      expect(breakdown.totalDuration).toBe(30); // 30 - 0
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

      expect(breakdown.totalDuration).toBe(0);
      expect(breakdown.participants).toHaveLength(0);
    });
  });

  describe("getTrendsForUser", () => {
    it("should aggregate trends across meetings for a user", async () => {
      const mockUserId = "1";
      const mockMeeting1 = {
        _id: "m1",
        title: "Meeting 1",
        date: new Date("2026-08-01"),
      };
      const mockMeeting2 = {
        _id: "m2",
        title: "Meeting 2",
        date: new Date("2026-08-02"),
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
  });
});
