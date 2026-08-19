import { jest } from "@jest/globals";
import { breakoutRoomService } from "../breakoutRoomService.js";
import BreakoutRoom from "../../models/breakoutRoomModel.js";
import Meeting from "../../models/meetingModel.js";

// Mock dependencies
jest.mock("../../models/breakoutRoomModel.js", () => {
  return function () {
    this.save = jest.fn();
    return this;
  };
});
BreakoutRoom.findById = jest.fn();

jest.mock("../../models/meetingModel.js");
Meeting.findById = jest.fn();

jest.mock("../GenerativeAIService.js", () => {
  return {
    generateText: jest.fn(),
  };
});

describe("breakoutRoomService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createRoom", () => {
    it("should create a room if meeting exists", async () => {
      const mockMeeting = { _id: "meeting123" };
      Meeting.findById.mockResolvedValue(mockMeeting);

      const mockSave = jest
        .fn()
        .mockResolvedValue({ _id: "room123", name: "Room 1" });
      BreakoutRoom.prototype.save = mockSave;

      const result = await breakoutRoomService.createRoom(
        "meeting123",
        "Room 1",
      );

      expect(Meeting.findById).toHaveBeenCalledWith("meeting123");
      expect(mockSave).toHaveBeenCalled();
      expect(result.name).toBe("Room 1");
    });

    it("should throw error if meeting not found", async () => {
      Meeting.findById.mockResolvedValue(null);
      await expect(
        breakoutRoomService.createRoom("meeting123", "Room 1"),
      ).rejects.toThrow("Meeting not found");
    });
  });

  describe("closeRoom", () => {
    it("should close room successfully", async () => {
      const mockRoom = {
        _id: "room123",
        meetingId: "meeting123",
        name: "Room 1",
        transcript: [], // Empty transcript, so no AI generation is triggered
        save: jest.fn().mockResolvedValue(true),
      };

      const mockMeeting = {
        _id: "meeting123",
        description: "Original meeting text.",
        save: jest.fn().mockResolvedValue(true),
      };

      BreakoutRoom.findById.mockResolvedValue(mockRoom);
      Meeting.findById.mockResolvedValue(mockMeeting);

      await breakoutRoomService.closeRoom("room123");

      expect(mockRoom.status).toBe("closed");
      expect(mockRoom.save).toHaveBeenCalled();
    });
  });
});
