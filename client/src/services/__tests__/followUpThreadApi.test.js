import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../apiClient.js";
import {
  getFollowUpThreads,
  createFollowUpThread,
  createThreadReply,
  updateThreadReply,
  deleteThreadReply,
  resolveFollowUpThread,
} from "../followUpThreadApi.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("followUpThreadApi (#1875)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches follow-up threads with /api/follow-up-threads/meeting/:meetingId", async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, threads: [{ _id: "thread-1" }] },
    });

    const result = await getFollowUpThreads("meet-123");

    expect(api.get).toHaveBeenCalledWith(
      "/api/follow-up-threads/meeting/meet-123",
    );
    expect(result).toEqual({
      success: true,
      threads: [{ _id: "thread-1" }],
    });
  });

  it("creates a follow-up thread with /api/follow-up-threads/meeting/:meetingId", async () => {
    const payload = { content: "New question", type: "decision" };
    api.post.mockResolvedValueOnce({
      data: { success: true, thread: { _id: "thread-2", ...payload } },
    });

    const result = await createFollowUpThread("meet-123", payload);

    expect(api.post).toHaveBeenCalledWith(
      "/api/follow-up-threads/meeting/meet-123",
      payload,
    );
    expect(result.success).toBe(true);
  });

  it("creates a thread reply with /api/follow-up-threads/:threadId/replies", async () => {
    const replyPayload = { content: "This is a reply" };
    api.post.mockResolvedValueOnce({
      data: { success: true, reply: { _id: "reply-1", ...replyPayload } },
    });

    const result = await createThreadReply("thread-1", replyPayload);

    expect(api.post).toHaveBeenCalledWith(
      "/api/follow-up-threads/thread-1/replies",
      replyPayload,
    );
    expect(result.success).toBe(true);
  });

  it("updates a thread reply with /api/follow-up-threads/replies/:replyId", async () => {
    const updatePayload = { content: "Updated content" };
    api.put.mockResolvedValueOnce({
      data: { success: true, reply: { _id: "reply-1", ...updatePayload } },
    });

    const result = await updateThreadReply("reply-1", updatePayload);

    expect(api.put).toHaveBeenCalledWith(
      "/api/follow-up-threads/replies/reply-1",
      updatePayload,
    );
    expect(result.success).toBe(true);
  });

  it("deletes a thread reply with /api/follow-up-threads/replies/:replyId", async () => {
    api.delete.mockResolvedValueOnce({
      data: { success: true, message: "Deleted" },
    });

    const result = await deleteThreadReply("reply-1");

    expect(api.delete).toHaveBeenCalledWith(
      "/api/follow-up-threads/replies/reply-1",
    );
    expect(result.success).toBe(true);
  });

  it("resolves a follow-up thread with /api/follow-up-threads/:threadId/resolve", async () => {
    api.put.mockResolvedValueOnce({
      data: { success: true, thread: { _id: "thread-1", status: "resolved" } },
    });

    const result = await resolveFollowUpThread("thread-1");

    expect(api.put).toHaveBeenCalledWith(
      "/api/follow-up-threads/thread-1/resolve",
    );
    expect(result.success).toBe(true);
  });
});
