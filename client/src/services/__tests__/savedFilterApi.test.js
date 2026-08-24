import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../apiClient.js";
import { savedFilterApi } from "../savedFilterApi.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("savedFilterApi regression & /api prefix path tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts to /api/saved-filters when creating a filter", async () => {
    const payload = { name: "Weekly Syncs", filters: { type: "internal" } };
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, filter: { _id: "f1", ...payload } },
    });

    const res = await savedFilterApi.createFilter(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/api/saved-filters", payload);
    expect(res.data.success).toBe(true);
  });

  it("fetches from /api/saved-filters when listing filters", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { success: true, filters: [{ _id: "f1", name: "Weekly Syncs" }] },
    });

    const res = await savedFilterApi.getFilters();

    expect(apiClient.get).toHaveBeenCalledWith("/api/saved-filters");
    expect(res.data.filters.length).toBe(1);
  });

  it("puts to /api/saved-filters/:id when updating a filter", async () => {
    const payload = { name: "Updated View" };
    apiClient.put.mockResolvedValueOnce({ data: { success: true } });

    await savedFilterApi.updateFilter("f1", payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/saved-filters/f1",
      payload,
    );
  });

  it("deletes from /api/saved-filters/:id when deleting a filter", async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { success: true } });

    await savedFilterApi.deleteFilter("f1");

    expect(apiClient.delete).toHaveBeenCalledWith("/api/saved-filters/f1");
  });

  it("puts to /api/saved-filters/:id/pin when toggling pin status", async () => {
    apiClient.put.mockResolvedValueOnce({ data: { success: true } });

    await savedFilterApi.togglePin("f1", true);

    expect(apiClient.put).toHaveBeenCalledWith("/api/saved-filters/f1/pin", {
      isPinned: true,
    });
  });

  it("handles full lifecycle regression: create -> pin -> list", async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        filter: { _id: "f100", name: "Custom View", isPinned: false },
      },
    });
    apiClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        filter: { _id: "f100", name: "Custom View", isPinned: true },
      },
    });
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        filters: [{ _id: "f100", name: "Custom View", isPinned: true }],
      },
    });

    const createRes = await savedFilterApi.createFilter({
      name: "Custom View",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/saved-filters", {
      name: "Custom View",
    });
    expect(createRes.data.filter._id).toBe("f100");

    await savedFilterApi.togglePin("f100", true);
    expect(apiClient.put).toHaveBeenCalledWith("/api/saved-filters/f100/pin", {
      isPinned: true,
    });

    const listRes = await savedFilterApi.getFilters();
    expect(apiClient.get).toHaveBeenCalledWith("/api/saved-filters");
    expect(listRes.data.filters[0].isPinned).toBe(true);
  });
});
