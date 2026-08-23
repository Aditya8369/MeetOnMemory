import mongoose from "mongoose";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Webhook from "../models/Webhook.js";
import WebhookDelivery from "../models/WebhookDelivery.js";
import {
  rotateWebhookSecret,
  pingWebhook,
} from "../controllers/webhookController.js";
import { performDispatch } from "../services/webhookDispatcherService.js";

// Mock services/models
vi.mock("../services/webhookDispatcherService.js", () => ({
  performDispatch: vi.fn(),
}));

describe("Webhook Secret Rotation and Pings (#2070)", () => {
  const webhookId = new mongoose.Types.ObjectId().toString();
  const orgId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rotateWebhookSecret", () => {
    it("updates webhook secret and returns it to authorized admin", async () => {
      const mockWebhook = {
        _id: webhookId,
        organizationId: orgId,
        secret: "old-secret-value",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Webhook, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue(mockWebhook),
      });

      const { default: Organization } =
        await import("../models/organizationModel.js");
      vi.spyOn(Organization, "findById").mockResolvedValue({
        owner: new mongoose.Types.ObjectId(),
      });
      const { default: Membership } =
        await import("../models/membershipModel.js");
      vi.spyOn(Membership, "findOne").mockReturnValue({
        lean: () => ({ role: "admin", status: "active" }),
      });

      const req = {
        params: { id: webhookId },
        user: { _id: "admin-user" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await rotateWebhookSecret(req, res, () => {});

      expect(mockWebhook.save).toHaveBeenCalled();
      expect(mockWebhook.secret).not.toBe("old-secret-value");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            secret: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("pingWebhook", () => {
    it("fires test ping dispatch and returns the created delivery record", async () => {
      const mockWebhook = {
        _id: webhookId,
        organizationId: orgId,
      };

      vi.spyOn(Webhook, "findById").mockResolvedValue(mockWebhook);
      const mockDelivery = {
        _id: "del_1",
        webhookId,
        status: "delivered",
        responseStatus: 200,
      };

      performDispatch.mockResolvedValue(mockDelivery);

      const req = {
        params: { id: webhookId },
        user: { _id: "admin-user" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await pingWebhook(req, res, () => {});

      expect(performDispatch).toHaveBeenCalledWith(
        webhookId,
        expect.objectContaining({
          event: "webhook.ping",
        }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            delivery: mockDelivery,
          }),
        }),
      );
    });
  });
});
