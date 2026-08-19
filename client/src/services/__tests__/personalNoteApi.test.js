import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../apiClient";
import { personalNoteApi } from "../personalNoteApi";

vi.mock("../apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("personalNoteApi endpoint prefix (#1534)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: { success: true } });
    apiClient.post.mockResolvedValue({ data: { success: true } });
    apiClient.put.mockResolvedValue({ data: { success: true } });
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
  });

  it("targets /api/personal-notes/:meetingId for getNoteByMeetingId and getByMeetingId", async () => {
    await personalNoteApi.getNoteByMeetingId("m-123");
    expect(apiClient.get).toHaveBeenCalledWith("/api/personal-notes/m-123");

    await personalNoteApi.getByMeetingId("m-123");
    expect(apiClient.get).toHaveBeenCalledWith("/api/personal-notes/m-123");
  });

  it("targets /api/personal-notes/:meetingId for upsertNote", async () => {
    await personalNoteApi.upsertNote("m-123", { content: "Note text" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/personal-notes/m-123", {
      content: "Note text",
    });
  });

  it("targets /api/personal-notes/:meetingId/annotations for annotations", async () => {
    await personalNoteApi.addAnnotation("m-123", { text: "Annotation" });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/personal-notes/m-123/annotations",
      { text: "Annotation" },
    );

    await personalNoteApi.removeAnnotation("m-123", "ann-456");
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/api/personal-notes/m-123/annotations/ann-456",
    );
  });

  it("targets /api/personal-notes/:meetingId/pin for togglePin", async () => {
    await personalNoteApi.togglePin("m-123", true);
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/personal-notes/m-123/pin",
      { isPinned: true },
    );
  });

  it("targets /api/personal-notes/pinned for getPinnedNotes", async () => {
    await personalNoteApi.getPinnedNotes();
    expect(apiClient.get).toHaveBeenCalledWith("/api/personal-notes/pinned");
  });

  it("targets /api/personal-notes/search for searchNotes", async () => {
    await personalNoteApi.searchNotes("roadmap");
    expect(apiClient.get).toHaveBeenCalledWith("/api/personal-notes/search", {
      params: { q: "roadmap" },
    });
  });

  it("targets /api/personal-notes/:meetingId/clear and delete", async () => {
    await personalNoteApi.clearNoteContent("m-123");
    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/personal-notes/m-123/clear",
    );

    await personalNoteApi.deleteNote("m-123");
    expect(apiClient.delete).toHaveBeenCalledWith("/api/personal-notes/m-123");
  });

  it("never produces duplicate /api/api prefixes across all personal note endpoints", async () => {
    await personalNoteApi.getNoteByMeetingId("m-123");
    await personalNoteApi.getByMeetingId("m-123");
    await personalNoteApi.upsertNote("m-123", "test content");
    await personalNoteApi.addAnnotation("m-123", { text: "ann" });
    await personalNoteApi.removeAnnotation("m-123", "ann-1");
    await personalNoteApi.togglePin("m-123", false);
    await personalNoteApi.getPinnedNotes();
    await personalNoteApi.searchNotes("query");
    await personalNoteApi.clearNoteContent("m-123");
    await personalNoteApi.deleteNote("m-123");

    const calls = [
      ...apiClient.get.mock.calls,
      ...apiClient.post.mock.calls,
      ...apiClient.put.mock.calls,
      ...apiClient.patch.mock.calls,
      ...apiClient.delete.mock.calls,
    ];

    for (const [url] of calls) {
      expect(url).toMatch(/^\/api\/personal-notes\b/);
      expect(url).not.toContain("/api/api/");
    }
  });
});
