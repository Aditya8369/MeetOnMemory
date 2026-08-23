import { jest } from "@jest/globals";

jest.unstable_mockModule("../services/webhookDispatcherService.js", () => ({
  dispatchWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

const { default: eventBus } = await import("../services/eventBus.js");
const { dispatchWebhookEvent } =
  await import("../services/webhookDispatcherService.js");
const { WEBHOOK_EVENT_NAMES } = await import("../config/webhookEvents.js");
await import("../services/webhookEventListeners.js");

describe("expanded webhook event catalog", () => {
  test("contains the expanded domain event set without duplicates", () => {
    expect(WEBHOOK_EVENT_NAMES.length).toBe(14);
    expect(new Set(WEBHOOK_EVENT_NAMES).size).toBe(WEBHOOK_EVENT_NAMES.length);
    expect(WEBHOOK_EVENT_NAMES).toEqual(
      expect.arrayContaining([
        "meeting.updated",
        "meeting.soft_deleted",
        "meeting.restored",
        "meeting.permanently_deleted",
        "meeting.ended",
        "policy.created",
        "actionItem.completed",
        "organization.joined",
        "export.ready",
        "live_meeting.notified",
        "gamification.badgesUnlocked",
      ]),
    );
  });

  test("dispatches a newly supported meeting.updated event", async () => {
    eventBus.emit("meeting.updated", {
      _id: "meeting-1",
      title: "Updated meeting",
      organization: "org-1",
      status: "completed",
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "org-1",
      "meeting.updated",
      expect.objectContaining({
        meetingId: "meeting-1",
        title: "Updated meeting",
        organizationId: "org-1",
      }),
    );
  });
});
