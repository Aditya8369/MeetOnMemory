import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useActionItems } from "../useActionItems";
import api from "../../services/apiClient";

vi.mock("../../services/apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useActionItems hook (#1874)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches action items with /api/action-items prefix", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [{ _id: "item-1", title: "Write tests", status: "pending" }],
      },
    });

    const { result } = renderHook(() => useActionItems());

    await act(async () => {
      await result.current.fetchItems({ status: "pending" });
    });

    expect(api.get).toHaveBeenCalledWith("/api/action-items?status=pending");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe("Write tests");
  });

  it("fetches meeting action items with /api/action-items/meeting/:meetingId prefix", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [{ _id: "item-2", title: "Meeting item", status: "in_progress" }],
      },
    });

    const { result } = renderHook(() => useActionItems());

    await act(async () => {
      await result.current.fetchMeetingItems("meeting-123");
    });

    expect(api.get).toHaveBeenCalledWith(
      "/api/action-items/meeting/meeting-123",
    );
    expect(result.current.items).toHaveLength(1);
  });

  it("extracts action items from meeting with /api/action-items/meetings/:meetingId/extract-actions", async () => {
    api.post.mockResolvedValueOnce({
      data: {
        count: 2,
        data: [
          { _id: "item-3", title: "Extracted item 1" },
          { _id: "item-4", title: "Extracted item 2" },
        ],
      },
    });

    const { result } = renderHook(() => useActionItems());

    let count;
    await act(async () => {
      count = await result.current.extractFromMeeting("meeting-123");
    });

    expect(api.post).toHaveBeenCalledWith(
      "/api/action-items/meetings/meeting-123/extract-actions",
    );
    expect(count).toBe(2);
    expect(result.current.items).toHaveLength(2);
  });

  it("updates an action item with /api/action-items/:id", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [{ _id: "item-1", title: "Task 1", status: "pending" }],
      },
    });
    api.patch.mockResolvedValueOnce({
      data: {
        data: { _id: "item-1", title: "Task 1", status: "completed" },
      },
    });

    const { result } = renderHook(() => useActionItems());

    await act(async () => {
      await result.current.fetchItems();
    });

    let success;
    await act(async () => {
      success = await result.current.updateItem("item-1", {
        status: "completed",
      });
    });

    expect(api.patch).toHaveBeenCalledWith("/api/action-items/item-1", {
      status: "completed",
    });
    expect(success).toBe(true);
    expect(result.current.items[0].status).toBe("completed");
  });

  it("deletes an action item with /api/action-items/:id", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [{ _id: "item-1", title: "Task 1" }],
      },
    });
    api.delete.mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() => useActionItems());

    await act(async () => {
      await result.current.fetchItems();
    });

    let success;
    await act(async () => {
      success = await result.current.deleteItem("item-1");
    });

    expect(api.delete).toHaveBeenCalledWith("/api/action-items/item-1");
    expect(success).toBe(true);
    expect(result.current.items).toHaveLength(0);
  });
});
