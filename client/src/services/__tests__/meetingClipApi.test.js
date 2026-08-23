import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../apiClient";
import meetingClipApi from "../meetingClipApi";

vi.mock("../apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("meetingClipApi (#1987)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
    apiClient.post.mockResolvedValue({ data: { _id: "clip-1" } });
    apiClient.put.mockResolvedValue({ data: { _id: "clip-1" } });
    apiClient.delete.mockResolvedValue({ data: { message: "ok" } });
  });

  it("lists clips through the authenticated /api/clips meeting route", async () => {
    await meetingClipApi.getMeetingClips("meeting-123");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/clips/meeting/meeting-123",
    );
  });

  it("creates, updates, deletes, and annotates via /api/clips", async () => {
    await meetingClipApi.createClip({
      meetingId: "meeting-123",
      title: "Clip",
    });
    await meetingClipApi.updateClip("clip-1", { title: "Renamed" });
    await meetingClipApi.deleteClip("clip-1");
    await meetingClipApi.addClipAnnotation("clip-1", {
      text: "Note",
      timestamp: 4,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/clips", {
      meetingId: "meeting-123",
      title: "Clip",
    });
    expect(apiClient.put).toHaveBeenCalledWith("/api/clips/clip-1", {
      title: "Renamed",
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/clips/clip-1");
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/clips/clip-1/annotations",
      {
        text: "Note",
        timestamp: 4,
      },
    );
  });
});
