import { beforeEach, describe, expect, it, vi } from "vitest";
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
const { buildArchiveMatch, buildArchivePipeline, getArchivedMemoriesPage } =
  await import("../services/archivedKnowledgeService.js");

describe("archivedKnowledgeService #2072 tag facets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds an exact tag filter to the archive match", () => {
    const match = buildArchiveMatch({
      organization: new mongoose.Types.ObjectId(),
      tag: "roadmap",
    });

    expect(match.aliases).toBe("roadmap");
  });

  it("builds a full-result tag facet alongside pagination", () => {
    const pipeline = buildArchivePipeline({
      type: "all",
      organization: new mongoose.Types.ObjectId(),
      skip: 0,
      limit: 10,
    });

    const facet = pipeline.find((stage) => stage.$facet)?.$facet;
    expect(facet?.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $unwind: "$aliases" }),
        expect.objectContaining({
          $group: { _id: "$aliases", count: { $sum: 1 } },
        }),
      ]),
    );
  });

  it("returns normalized tag facet values from the complete result set", async () => {
    Decision.aggregate.mockResolvedValue([
      {
        metadata: [{ total: 3 }],
        data: [{ _id: "d1", type: "decision" }],
        tags: [
          { _id: "roadmap", count: 2 },
          { _id: "finance", count: 1 },
        ],
      },
    ]);

    const result = await getArchivedMemoriesPage({
      organization: new mongoose.Types.ObjectId(),
      type: "all",
      page: 1,
      limit: 10,
    });

    expect(result.facets.tags).toEqual([
      { value: "roadmap", count: 2 },
      { value: "finance", count: 1 },
    ]);
  });
});
