import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/recapScheduleModel.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));
vi.mock("../models/membershipModel.js", () => ({
  default: {
    find: vi.fn(),
  },
}));
vi.mock("../models/userModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));
vi.mock("../models/recapDeliveryModel.js", () => ({
  default: {},
}));
vi.mock("../services/queueService.js", () => ({
  recapDeliveryQueue: { isActive: false, add: vi.fn() },
}));
vi.mock("../utils/webhookUrlSafety.js", () => ({
  isSafeWebhookUrl: vi.fn(async () => true),
}));

import RecapSchedule from "../models/recapScheduleModel.js";
import Membership from "../models/membershipModel.js";
import { dryRunDelivery } from "../controllers/recapScheduleController.js";

describe("dryRunDelivery (Issue #2069)", () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns channel recipients and webhook warning when URL missing", async () => {
    RecapSchedule.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        scheduleType: "daily",
        deliveryChannel: "webhook",
        webhookUrl: "",
      }),
    });
    Membership.find.mockReturnValue({
      select: () => ({
        populate: () => ({
          limit: () => ({
            lean: async () => [
              {
                user: {
                  _id: "u1",
                  name: "Ada",
                  email: "ada@example.com",
                },
              },
            ],
          }),
        }),
      }),
    });

    await dryRunDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.channel).toBe("webhook");
    expect(payload.warnings[0]).toMatch(/no webhook url/i);
    expect(payload.recipients).toHaveLength(1);
    expect(payload.recipients[0].wouldReceive).toBe(false);
  });

  it("prefers unsaved body channel over stored schedule", async () => {
    RecapSchedule.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        scheduleType: "daily",
        deliveryChannel: "email",
        webhookUrl: null,
      }),
    });
    Membership.find.mockReturnValue({
      select: () => ({
        populate: () => ({
          limit: () => ({
            lean: async () => [
              {
                user: {
                  _id: "u1",
                  name: "Ada",
                  email: "ada@example.com",
                },
              },
            ],
          }),
        }),
      }),
    });
    req.body = {
      deliveryChannel: "in_app",
      webhookUrl: "",
    };

    await dryRunDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].channel).toBe("in_app");
    expect(res.json.mock.calls[0][0].recipients[0].wouldReceive).toBe(true);
  });
});
