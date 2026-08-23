import { describe, expect, it, beforeEach, vi } from "vitest";
import { knowledgeApi } from "../knowledgeApi.js";
import apiClient from "../apiClient.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("knowledgeApi - Knowledge Archive #2072", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the selected archive tag to the server", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, memories: [], facets: { tags: [] } },
    });

    await knowledgeApi.getArchivedMemories({
      type: "all",
      tag: "roadmap",
      page: 2,
      limit: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("type=all"),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("tag=roadmap"),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("limit=20"),
    );
  });

  it("posts a bulk archive restore request with the selected memories", async () => {
    apiClient.post.mockResolvedValue({
      data: {
        success: true,
        restored: 2,
        failed: 1,
        total: 3,
      },
    });

    await knowledgeApi.bulkRestoreArchivedMemories(
      [
        { type: "decision", id: "d1" },
        { type: "action-item", id: "a1" },
        { type: "decision", id: "d2" },
      ],
      "Recovered during archive review",
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/knowledge/archive/restore",
      {
        items: [
          { type: "decision", id: "d1" },
          { type: "action-item", id: "a1" },
          { type: "decision", id: "d2" },
        ],
        reason: "Recovered during archive review",
      },
    );
  });
});
