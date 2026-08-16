import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("../models/decisionModel.js", () => ({
  default: {
    aggregate: vi.fn(),
    collection: { name: "decisions" },
  },
}));

vi.mock("../models/actionItemModel.js", () => ({
  default: {
    aggregate: vi.fn(),
    collection: { name: "actionitems" },
  },
}));

const Decision = (await import("../models/decisionModel.js")).default;
const ActionItem = (await import("../models/actionItemModel.js")).default;
const {
  buildLifecycleMatch,
  buildLifecyclePipeline,
  getLifecycleMemoriesPage,
} = await import("../services/lifecycleKnowledgeService.js");

describe("lifecycleKnowledgeService (#1552)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildLifecycleMatch", () => {
    it("scopes to organization and optional lifecycle state", () => {
      const orgId = new mongoose.Types.ObjectId();
      const match = buildLifecycleMatch({
        organization: orgId,
        lifecycleState: "dormant",
      });

      expect(String(match.organization)).toBe(String(orgId));
      expect(match.lifecycleState).toBe("dormant");
    });

    it("omits lifecycleState when requesting all states", () => {
      const match = buildLifecycleMatch({
        organization: "507f1f77bcf86cd799439011",
        lifecycleState: "all",
      });
      expect(match.lifecycleState).toBeUndefined();
    });

    it("adds literal text search when provided", () => {
      const match = buildLifecycleMatch({
        organization: "507f1f77bcf86cd799439011",
        search: "  roadmap  ",
      });
      expect(match.text).toEqual({ $regex: "roadmap", $options: "i" });
    });
  });

  describe("buildLifecyclePipeline", () => {
    it("unions decisions and action items before skip/limit", () => {
      const pipeline = buildLifecyclePipeline({
        type: "all",
        organization: "507f1f77bcf86cd799439011",
        skip: 20,
        limit: 20,
      });

      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            $unionWith: expect.objectContaining({ coll: "actionitems" }),
          }),
          expect.objectContaining({ $sort: { createdAt: -1, _id: -1 } }),
        ]),
      );

      const facet = pipeline.find((stage) => stage.$facet);
      expect(facet.$facet.data[0]).toEqual({ $skip: 20 });
      expect(facet.$facet.data[1]).toEqual({ $limit: 20 });
      expect(facet.$facet.metadata).toEqual([{ $count: "total" }]);
    });

    it("does not union for a single memory type", () => {
      const pipeline = buildLifecyclePipeline({
        type: "decision",
        organization: "507f1f77bcf86cd799439011",
        skip: 0,
        limit: 20,
      });
      expect(pipeline.some((stage) => stage.$unionWith)).toBe(false);
    });
  });

  describe("getLifecycleMemoriesPage", () => {
    it("returns first page with pagination metadata", async () => {
      Decision.aggregate.mockResolvedValue([
        {
          metadata: [{ total: 45 }],
          data: [
            { _id: "d1", type: "decision", text: "Decide A" },
            { _id: "a1", type: "action-item", text: "Do B" },
          ],
        },
      ]);

      const result = await getLifecycleMemoriesPage({
        organization: "507f1f77bcf86cd799439011",
        type: "all",
        page: 1,
        limit: 20,
      });

      expect(result.memories).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 45,
        page: 1,
        limit: 20,
        totalPages: 3,
        hasMore: true,
      });
    });

    it("returns subsequent page with correct skip", async () => {
      Decision.aggregate.mockResolvedValue([
        {
          metadata: [{ total: 45 }],
          data: [{ _id: "d2", type: "decision" }],
        },
      ]);

      await getLifecycleMemoriesPage({
        organization: "507f1f77bcf86cd799439011",
        type: "all",
        page: 2,
        limit: 20,
      });

      const pipeline = Decision.aggregate.mock.calls[0][0];
      const facet = pipeline.find((stage) => stage.$facet);
      expect(facet.$facet.data[0]).toEqual({ $skip: 20 });
      expect(facet.$facet.data[1]).toEqual({ $limit: 20 });
    });

    it("returns last page with hasMore false", async () => {
      Decision.aggregate.mockResolvedValue([
        {
          metadata: [{ total: 25 }],
          data: [{ _id: "d3", type: "decision" }],
        },
      ]);

      const result = await getLifecycleMemoriesPage({
        organization: "507f1f77bcf86cd799439011",
        page: 2,
        limit: 20,
      });

      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
        hasMore: false,
      });
    });

    it("returns empty results with zero totals", async () => {
      Decision.aggregate.mockResolvedValue([{ metadata: [], data: [] }]);

      const result = await getLifecycleMemoriesPage({
        organization: "507f1f77bcf86cd799439011",
        lifecycleState: "expired",
        page: 1,
        limit: 20,
      });

      expect(result.memories).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it("queries ActionItem when type is action-item", async () => {
      ActionItem.aggregate.mockResolvedValue([
        {
          metadata: [{ total: 1 }],
          data: [{ _id: "a1", type: "action-item" }],
        },
      ]);

      await getLifecycleMemoriesPage({
        organization: "507f1f77bcf86cd799439011",
        type: "action-item",
        page: 1,
        limit: 10,
      });

      expect(ActionItem.aggregate).toHaveBeenCalled();
      expect(Decision.aggregate).not.toHaveBeenCalled();
    });

    it("rejects invalid type and missing organization", async () => {
      await expect(
        getLifecycleMemoriesPage({
          organization: "507f1f77bcf86cd799439011",
          type: "notes",
        }),
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        getLifecycleMemoriesPage({ type: "all" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
