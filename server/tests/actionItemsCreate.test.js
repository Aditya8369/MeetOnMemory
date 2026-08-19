import { describe, it, expect, vi, beforeEach } from "vitest";

const actionItemCreate = vi.fn();
const actionItemFindById = vi.fn();

vi.mock("../models/actionItemModel.js", () => ({
  default: {
    create: actionItemCreate,
    findById: actionItemFindById,
  },
}));

vi.mock("../services/actionItemExtractor.js", () => ({
  default: { extractFromTranscript: vi.fn() },
}));
vi.mock("../services/githubSyncService.js", () => ({
  syncActionItemToGitHub: vi.fn(),
}));
vi.mock("../services/jiraSyncService.js", () => ({
  syncActionItemToJira: vi.fn(),
}));
vi.mock("../services/linearSyncService.js", () => ({
  syncActionItemToLinear: vi.fn(),
}));
vi.mock("../services/eventBus.js", () => ({ default: { emit: vi.fn() } }));

const { createActionItem } =
  await import("../controllers/actionItems.controller.js");

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function populated(item) {
  return {
    populate: vi.fn().mockReturnThis(),
    then: undefined,
    ...item,
  };
}

describe("createActionItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionItemCreate.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });
    actionItemFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      then: undefined,
    });
  });

  it("creates a valid action item scoped to the authorized meeting", async () => {
    const req = {
      params: { meetingId: "507f1f77bcf86cd799439012" },
      user: { _id: "507f1f77bcf86cd799439013", organizationId: "org-1" },
      meeting: { organizationId: "org-1" },
      body: { title: "Follow up with finance", priority: "high" },
    };
    const res = response();

    actionItemFindById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            text: "Follow up with finance",
          }),
        }),
      }),
    });

    await createActionItem(req, res);

    expect(actionItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Follow up with finance",
        priority: "high",
        sourceMeetingId: req.params.meetingId,
        assignedBy: req.user._id,
        organization: "org-1",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects invalid action item payloads", async () => {
    const req = {
      params: { meetingId: "507f1f77bcf86cd799439012" },
      user: { _id: "507f1f77bcf86cd799439013" },
      meeting: {},
      body: {},
    };
    const res = response();

    await createActionItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(actionItemCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid meeting identifiers", async () => {
    const req = {
      params: { meetingId: "not-an-object-id" },
      user: { _id: "507f1f77bcf86cd799439013" },
      meeting: {},
      body: { text: "Follow up" },
    };
    const res = response();

    await createActionItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(actionItemCreate).not.toHaveBeenCalled();
  });
});
