import skillEndorsementService from "../services/skillEndorsementService.js";

import SkillEndorsement from "../models/skillEndorsementModel.js";
import Meeting from "../models/meetingModel.js";

// Mock the models
jest.mock("../models/skillEndorsementModel.js");
jest.mock("../models/meetingModel.js");

describe("Skill Endorsement Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createEndorsement", () => {
    it("should throw an error if user tries to endorse themselves", async () => {
      const data = {
        endorserId: "user1",
        recipientId: "user1",
        meetingId: "meeting1",
        skillTag: "Leadership",
      };

      await expect(
        skillEndorsementService.createEndorsement(data),
      ).rejects.toThrow("You cannot endorse yourself.");
    });

    it("should throw an error if meeting is not found", async () => {
      const data = {
        endorserId: "user1",
        recipientId: "user2",
        meetingId: "meeting1",
        skillTag: "Leadership",
      };

      Meeting.findById.mockResolvedValue(null);

      await expect(
        skillEndorsementService.createEndorsement(data),
      ).rejects.toThrow("Meeting not found.");
    });

    it("should throw an error if endorser is not a participant", async () => {
      const data = {
        endorserId: "user1",
        recipientId: "user2",
        meetingId: "meeting1",
        skillTag: "Leadership",
      };

      const mockMeeting = {
        participants: [{ user: "user2" }, { user: "user3" }],
        organization: "org1",
      };

      Meeting.findById.mockResolvedValue(mockMeeting);

      await expect(
        skillEndorsementService.createEndorsement(data),
      ).rejects.toThrow("Both users must be participants in the meeting.");
    });

    it("should throw an error if recipient is not a participant", async () => {
      const data = {
        endorserId: "user1",
        recipientId: "user2",
        meetingId: "meeting1",
        skillTag: "Leadership",
      };

      const mockMeeting = {
        participants: [{ user: "user1" }, { user: "user3" }],
        organization: "org1",
      };

      Meeting.findById.mockResolvedValue(mockMeeting);

      await expect(
        skillEndorsementService.createEndorsement(data),
      ).rejects.toThrow("Both users must be participants in the meeting.");
    });

    it("should create endorsement successfully if both are participants", async () => {
      const data = {
        endorserId: "user1",
        recipientId: "user2",
        meetingId: "meeting1",
        skillTag: "Leadership",
      };

      const mockMeeting = {
        participants: [{ user: "user1" }, { user: "user2" }],
        organization: "org1",
      };

      Meeting.findById.mockResolvedValue(mockMeeting);

      const mockSave = jest.fn().mockResolvedValue(true);
      SkillEndorsement.mockImplementation(() => {
        return { save: mockSave };
      });

      const result = await skillEndorsementService.createEndorsement(data);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
