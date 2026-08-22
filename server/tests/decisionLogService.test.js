import mongoose from "mongoose";
import decisionLogService from "../services/decisionLogService.js";
import DecisionLogEntry from "../models/decisionLogEntryModel.js";

jest.mock("../models/decisionLogEntryModel.js");

describe("DecisionLogService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createEntry", () => {
    it("should create a new decision log entry", async () => {
      const mockData = {
        decisionId: new mongoose.Types.ObjectId(),
        meetingId: new mongoose.Types.ObjectId(),
        organizationId: new mongoose.Types.ObjectId(),
        decidedBy: new mongoose.Types.ObjectId(),
        outcome: "implemented",
      };

      const mockEntry = {
        ...mockData,
        save: jest.fn().mockResolvedValue(true),
      };
      DecisionLogEntry.mockImplementation(() => mockEntry);

      const result = await decisionLogService.createEntry(mockData);
      expect(DecisionLogEntry).toHaveBeenCalledWith(mockData);
      expect(mockEntry.save).toHaveBeenCalled();
      expect(result).toBe(mockEntry);
    });
  });

  describe("updateOutcome", () => {
    it("should update outcome and impact assessment", async () => {
      const entryId = new mongoose.Types.ObjectId();
      const mockEntry = {
        _id: entryId,
        outcome: "implemented",
        impactAssessment: "Good",
      };

      DecisionLogEntry.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockEntry),
      });

      const result = await decisionLogService.updateOutcome(
        entryId,
        "implemented",
        "Good",
      );
      expect(DecisionLogEntry.findByIdAndUpdate).toHaveBeenCalledWith(
        entryId,
        { $set: { outcome: "implemented", impactAssessment: "Good" } },
        { new: true },
      );
      expect(result).toEqual(mockEntry);
    });
  });
});
