import { describe, expect, it, vi, beforeEach } from "vitest";
import { sharedLinkApi, publicSharedApi } from "../sharedLinkApi.js";
import apiClient from "../apiClient.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("sharedLinkApi & publicSharedApi /api prefix verification (#1999)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts to /api/shared-links when creating a link", async () => {
    apiClient.post.mockResolvedValue({
      data: { success: true, link: { _id: "link-1" } },
    });

    const payload = { resourceId: "m-123", resourceType: "Meeting" };
    await sharedLinkApi.createLink(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/api/shared-links", payload);
  });

  it("fetches active links from /api/shared-links/:resourceType/:resourceId", async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, links: [] } });

    await sharedLinkApi.getActiveLinks("Meeting", "m-123");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/shared-links/Meeting/m-123",
    );
  });

  it("deletes from /api/shared-links/:id when revoking a link", async () => {
    apiClient.delete.mockResolvedValue({ data: { success: true } });

    await sharedLinkApi.revokeLink("link-123");

    expect(apiClient.delete).toHaveBeenCalledWith("/api/shared-links/link-123");
  });

  it("posts to /api/public/shared/:hash/verify when verifying passcode", async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });

    await publicSharedApi.verifyPasscode("hash123", { passcode: "secret" });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/public/shared/hash123/verify",
      { passcode: "secret" },
    );
  });

  it("fetches public resource from /api/public/shared/:hash", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, resourceType: "Meeting" },
    });

    await publicSharedApi.getPublicResource("hash123");

    expect(apiClient.get).toHaveBeenCalledWith("/api/public/shared/hash123");
  });
});
