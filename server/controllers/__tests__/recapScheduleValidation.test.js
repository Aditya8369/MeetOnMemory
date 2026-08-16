import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryDelivery, upsertSchedule } from "../recapScheduleController.js";
import RecapDelivery from "../../models/recapDeliveryModel.js";
import RecapSchedule from "../../models/recapScheduleModel.js";

vi.mock("../../models/recapDeliveryModel.js");
vi.mock("../../models/recapScheduleModel.js");
vi.mock("../../services/queueService.js", () => ({
  recapDeliveryQueue: { isActive: false, add: vi.fn() },
}));

describe("Recap Schedule Controller Validation (#1609)", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: {},
      body: {},
      user: { _id: "507f1f77bcf86cd799439011", organization: "org123" },
      authorizedOrganizationId: "org123",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("retryDelivery", () => {
    it("returns 400 Bad Request when deliveryId is invalid ObjectId format", async () => {
      req.params.deliveryId = "invalid-delivery-id";

      await retryDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid delivery ID format" }),
      );
    });

    it("retries delivery successfully for valid deliveryId", async () => {
      req.params.deliveryId = "507f1f77bcf86cd799439011";
      RecapDelivery.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          userId: "507f1f77bcf86cd799439011",
          meetingId: { organization: "org123", title: "Team Sync" },
        }),
      });

      await retryDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Delivery retry enqueued successfully",
        }),
      );
    });
  });

  describe("upsertSchedule", () => {
    it("returns 400 Bad Request when timezone exceeds maximum characters", async () => {
      req.body = {
        scheduleType: "daily",
        timezone: "a".repeat(51),
      };

      await upsertSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("upserts valid schedule payload successfully", async () => {
      req.body = {
        scheduleType: "daily",
        timezone: "America/New_York",
        preferredTime: "09:00",
      };
      RecapSchedule.findOneAndUpdate.mockResolvedValue({
        scheduleType: "daily",
        timezone: "America/New_York",
      });

      await upsertSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
