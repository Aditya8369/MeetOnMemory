import { describe, it, expect, vi, beforeEach } from "vitest";
import axiosInstance from "../apiClient.js";
import bulkMeetingApi from "../bulkMeetingApi.js";

vi.mock("../apiClient.js", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("bulkMeetingApi path construction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts to /api/bulk/meetings/archive for bulkArchive", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
    const meetingIds = ["m1", "m2"];

    await bulkMeetingApi.bulkArchive(meetingIds);

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/bulk/meetings/archive",
      {
        meetingIds: ["m1", "m2"],
      },
    );
  });

  it("posts to /api/bulk/meetings/tag for bulkTag", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
    const meetingIds = ["m1"];
    const tags = ["urgent", "client"];

    await bulkMeetingApi.bulkTag(meetingIds, tags);

    expect(axiosInstance.post).toHaveBeenCalledWith("/api/bulk/meetings/tag", {
      meetingIds: ["m1"],
      tags: ["urgent", "client"],
    });
  });

  it("posts to /api/bulk/meetings/delete for bulkSoftDelete", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
    const meetingIds = ["m1", "m2"];

    await bulkMeetingApi.bulkSoftDelete(meetingIds);

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/bulk/meetings/delete",
      {
        meetingIds: ["m1", "m2"],
      },
    );
  });

  it("posts to /api/bulk/meetings/restore for bulkRestore", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
    const meetingIds = ["m1"];

    await bulkMeetingApi.bulkRestore(meetingIds);

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/bulk/meetings/restore",
      {
        meetingIds: ["m1"],
      },
    );
  });

  it("posts to /api/bulk/meetings/export for bulkExport with responseType blob", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: new Blob([]) });
    const meetingIds = ["m1", "m2"];

    await bulkMeetingApi.bulkExport(meetingIds, "json");

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/bulk/meetings/export",
      { meetingIds: ["m1", "m2"], format: "json" },
      { responseType: "blob" },
    );
  });
});
