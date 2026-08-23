import { describe, expect, it, vi } from "vitest";

const bulkTransitionLifecycleStates = vi.fn();

vi.mock("../services/memoryLifecycleService.js", () => ({
  bulkTransitionLifecycleStates,
}));

import { bulkTransitionMemoryLifecycle } from "../controllers/memoryLifecycleBulkController.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("bulkTransitionMemoryLifecycle", () => {
  it("rejects an empty selection", async () => {
    const res = makeResponse();

    await bulkTransitionMemoryLifecycle(
      {
        user: { organization: "org-1" },
        body: { items: [], state: "archived" },
      },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(bulkTransitionLifecycleStates).not.toHaveBeenCalled();
  });

  it("deduplicates selected memories before transitioning", async () => {
    bulkTransitionLifecycleStates.mockResolvedValueOnce({
      requested: 1,
      found: 1,
      transitioned: 1,
      skipped: 0,
      errors: [],
    });

    const res = makeResponse();

    await bulkTransitionMemoryLifecycle(
      {
        user: { organization: "org-1", _id: "admin-1" },
        body: {
          items: [
            { type: "decision", id: "507f1f77bcf86cd799439011" },
            { type: "decision", id: "507f1f77bcf86cd799439011" },
          ],
          state: "archived",
        },
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(bulkTransitionLifecycleStates).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: "org-1",
        toState: "archived",
        items: [
          {
            type: "decision",
            id: "507f1f77bcf86cd799439011",
          },
        ],
      }),
    );
  });
});
