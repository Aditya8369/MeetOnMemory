import mongoose from "mongoose";
import Icebreaker from "../models/icebreakerModel.js";
import {
  generateIcebreakers,
  selectIcebreaker,
} from "../services/icebreakerService.js";
import * as generativeAIService from "../services/GenerativeAIService.js";
import Meeting from "../models/meetingModel.js";

jest.mock("../services/GenerativeAIService.js");

describe("Icebreaker Feature", () => {
  let mockMeetingId;
  let mockOrgId;

  beforeAll(() => {
    mockMeetingId = new mongoose.Types.ObjectId();
    mockOrgId = new mongoose.Types.ObjectId();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("selectIcebreaker", () => {
    it("should create a new icebreaker if one does not exist", async () => {
      Icebreaker.findOne = jest.fn().mockResolvedValue(null);
      const mockSave = jest.fn();
      Icebreaker.prototype.save = mockSave;

      await selectIcebreaker(
        mockMeetingId,
        mockOrgId,
        "fun",
        "What is your favorite food?",
      );

      expect(Icebreaker.findOne).toHaveBeenCalledWith({
        promptText: "What is your favorite food?",
        organization: mockOrgId,
      });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe("generateIcebreakers", () => {
    it("should fetch used icebreakers and generate new ones", async () => {
      Meeting.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: mockMeetingId,
          participants: [
            { name: "Alice", department: "Engineering", role: "Dev" },
          ],
        }),
      });

      Icebreaker.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ promptText: "Used prompt 1" }]),
      });

      generativeAIService.generateText.mockResolvedValue(
        '{"icebreakers": [{"category": "fun", "promptText": "New Prompt"}]}',
      );
      generativeAIService.parseJsonOutput.mockReturnValue({
        icebreakers: [{ category: "fun", promptText: "New Prompt" }],
      });

      const result = await generateIcebreakers(mockMeetingId, mockOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].promptText).toBe("New Prompt");
      expect(generativeAIService.generateText).toHaveBeenCalled();
      const promptArg = generativeAIService.generateText.mock.calls[0][0];
      expect(promptArg).toContain("Used prompt 1");
      expect(promptArg).toContain("Alice");
    });
  });
});
