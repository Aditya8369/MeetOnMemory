import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSpeakingTimeBreakdown,
  getSpeakingTimeTrends,
} from "../speakingTimeController.js";
import Meeting from "../../models/meetingModel.js";
import * as speakingTimeService from "../../services/speakingTimeService.js";

vi.mock("../../models/meetingModel.js");
vi.mock("../../services/speakingTimeService.js");

describe("Speaking Time Controller Validation (#1608)", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: {},
      query: {},
      user: { _id: "507f1f77bcf86cd799439011", organization: "org123" },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("getSpeakingTimeBreakdown", () => {
    it("returns 400 Bad Request when meetingId is invalid ObjectId format", async () => {
      req.params.meetingId = "invalid-id";

      await getSpeakingTimeBreakdown(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid meeting ID format",
        }),
      );
    });

    it("fetches breakdown successfully for valid meetingId", async () => {
      req.params.meetingId = "507f1f77bcf86cd799439011";
      Meeting.findById.mockResolvedValue({
        uploadedBy: "507f1f77bcf86cd799439011",
        participants: [],
      });
      speakingTimeService.getBreakdownForMeeting.mockResolvedValue({
        meetingId: "507f1f77bcf86cd799439011",
        breakdown: [],
      });

      await getSpeakingTimeBreakdown(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
  });

  describe("getSpeakingTimeTrends", () => {
    it("defaults limit to 10 when negative limit query is passed", async () => {
      req.query.limit = "-5";
      speakingTimeService.getTrendsForUser.mockResolvedValue([]);

      await getSpeakingTimeTrends(req, res);

      expect(speakingTimeService.getTrendsForUser).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        10,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("clamps limit to 50 when query exceeds max limit", async () => {
      req.query.limit = "100";
      speakingTimeService.getTrendsForUser.mockResolvedValue([]);

      await getSpeakingTimeTrends(req, res);

      expect(speakingTimeService.getTrendsForUser).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        50,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
