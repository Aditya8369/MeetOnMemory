import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateRules } from "../automationRuleService.js";
import AutomationRule from "../../models/automationRuleModel.js";
import Organization from "../../models/organizationModel.js";
import Webhook from "../../models/Webhook.js";
import { webhookQueue } from "../webhookDispatcherService.js";

vi.mock("../../models/automationRuleModel.js");
vi.mock("../../models/organizationModel.js");
vi.mock("../../models/Webhook.js");
vi.mock("../webhookDispatcherService.js", () => ({
  webhookQueue: {
    isActive: true,
    add: vi.fn(),
  },
}));

describe("Automation Webhook Organization Ownership (#1674)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches webhook action when webhook belongs to the same organization", async () => {
    const mockRule = {
      _id: "rule1",
      name: "Send Webhook on MoM",
      organization: "org123",
      enabled: true,
      trigger: { event: "mom.generated", filters: {} },
      actions: [
        {
          type: "webhook",
          config: { webhookId: "wh_same_org" },
        },
      ],
      executionCount: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    AutomationRule.find.mockResolvedValue([mockRule]);
    Organization.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({}),
    });
    Webhook.findById.mockResolvedValue({
      _id: "wh_same_org",
      organizationId: "org123",
    });

    await evaluateRules("mom.generated", {
      organization: "org123",
      meetingId: "m1",
    });

    expect(Webhook.findById).toHaveBeenCalledWith("wh_same_org");
    expect(webhookQueue.add).toHaveBeenCalledWith("dispatch-webhook", {
      webhookId: "wh_same_org",
      payload: expect.objectContaining({
        event: "mom.generated",
        ruleName: "Send Webhook on MoM",
      }),
    });
  });

  it("rejects and skips webhook dispatch when webhook belongs to a foreign organization", async () => {
    const mockRule = {
      _id: "rule2",
      name: "Malicious Webhook Trigger",
      organization: "org123",
      enabled: true,
      trigger: { event: "mom.generated", filters: {} },
      actions: [
        {
          type: "webhook",
          config: { webhookId: "wh_foreign_org" },
        },
      ],
      executionCount: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    AutomationRule.find.mockResolvedValue([mockRule]);
    Organization.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({}),
    });
    Webhook.findById.mockResolvedValue({
      _id: "wh_foreign_org",
      organizationId: "org_FOREIGN_456",
    });

    await evaluateRules("mom.generated", {
      organization: "org123",
      meetingId: "m1",
    });

    expect(Webhook.findById).toHaveBeenCalledWith("wh_foreign_org");
    expect(webhookQueue.add).not.toHaveBeenCalled();
  });

  it("handles non-existent webhook gracefully without throwing", async () => {
    const mockRule = {
      _id: "rule3",
      name: "Missing Webhook Rule",
      organization: "org123",
      enabled: true,
      trigger: { event: "mom.generated", filters: {} },
      actions: [
        {
          type: "webhook",
          config: { webhookId: "wh_non_existent" },
        },
      ],
      executionCount: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    AutomationRule.find.mockResolvedValue([mockRule]);
    Organization.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({}),
    });
    Webhook.findById.mockResolvedValue(null);

    await evaluateRules("mom.generated", {
      organization: "org123",
      meetingId: "m1",
    });

    expect(Webhook.findById).toHaveBeenCalledWith("wh_non_existent");
    expect(webhookQueue.add).not.toHaveBeenCalled();
  });
});
