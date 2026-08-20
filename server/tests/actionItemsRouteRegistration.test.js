import { describe, it, expect, vi } from "vitest";

vi.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => next(),
}));
vi.mock("../middleware/meetingAuth.js", () => ({
  verifyMeetingAccess: (req, res, next) => next(),
  verifyActionItemAccess: (req, res, next) => next(),
}));

vi.mock("../controllers/actionItems.controller.js", () => ({
  createActionItem: vi.fn(),
  extractFromMeeting: vi.fn(),
  getActionItems: vi.fn(),
  getMeetingActionItems: vi.fn(),
  updateActionItem: vi.fn(),
  deleteActionItem: vi.fn(),
}));

const actionItemsRouter = (await import("../routes/actionItems.routes.js"))
  .default;
const routes = (await import("../routes/index.js")).default;

function matchingLayers(router, path) {
  return (router.stack || []).filter(
    (layer) => typeof layer.match === "function" && layer.match(path),
  );
}

describe("Action Items route registration", () => {
  it("registers the create endpoint with meeting authorization", () => {
    const createLayer = (actionItemsRouter.stack || []).find(
      (layer) =>
        layer.route?.path === "/meetings/:meetingId" &&
        layer.route?.methods?.post,
    );

    expect(createLayer).toBeDefined();
    expect(createLayer.route.stack.length).toBeGreaterThanOrEqual(2);
  });

  it("mounts the action items router exactly once at /api/action-items", () => {
    expect(matchingLayers(routes, "/api/action-items")).toHaveLength(1);
  });
});
