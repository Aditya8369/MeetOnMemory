import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/recapScheduleModel.js", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("../models/recapDeliveryModel.js", () => ({
  default: {},
}));
vi.mock("../models/membershipModel.js", () => ({
  default: { find: vi.fn() },
}));
vi.mock("../models/userModel.js", () => ({
  default: { findById: vi.fn() },
}));
vi.mock("../services/queueService.js", () => ({
  recapDeliveryQueue: { isActive: false, add: vi.fn() },
}));
vi.mock("../utils/webhookUrlSafety.js", () => ({
  isSafeWebhookUrl: vi.fn(async () => true),
}));

import RecapSchedule from "../models/recapScheduleModel.js";
import { isSafeWebhookUrl } from "../utils/webhookUrlSafety.js";
import { upsertSchedule } from "../controllers/recapScheduleController.js";

describe("upsertSchedule channel validation (Issue #2069)", () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    isSafeWebhookUrl.mockResolvedValue(true);
    req = {
      user: { _id: "u1", organization: "org1" },
      authorizedOrganizationId: "org1",
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("rejects webhook channel without URL", async () => {
    req.body = {
      scheduleType: "daily",
      deliveryChannel: "webhook",
      webhookUrl: "",
    };

    await upsertSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/webhook url is required/i),
      }),
    );
  });

  it("rejects unsafe webhook destinations", async () => {
    isSafeWebhookUrl.mockResolvedValueOnce(false);
    req.body = {
      scheduleType: "immediate",
      deliveryChannel: "webhook",
      webhookUrl: "http://localhost/hook",
    };

    await upsertSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/not allowed/i),
      }),
    );
  });

  it("upserts email channel without webhook URL", async () => {
    RecapSchedule.findOneAndUpdate.mockResolvedValue({
      scheduleType: "daily",
      deliveryChannel: "email",
    });
    req.body = {
      scheduleType: "daily",
      deliveryChannel: "email",
      timezone: "UTC",
    };

    await upsertSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(RecapSchedule.findOneAndUpdate).toHaveBeenCalled();
  });
});
