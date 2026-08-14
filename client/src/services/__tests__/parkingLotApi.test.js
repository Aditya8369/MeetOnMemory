import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../apiClient";
import { parkingLotApi } from "../parkingLotApi";

vi.mock("../apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("parkingLotApi endpoint contract (#1548)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the canonical /api prefix when creating a parking-lot topic", () => {
    parkingLotApi.addTopic({ title: "Follow up" });

    expect(apiClient.post).toHaveBeenCalledWith("/api/parking-lot", {
      title: "Follow up",
    });
  });

  it("uses the canonical /api prefix when listing an organization's parking lot", () => {
    parkingLotApi.getOrganizationParkingLot("org-123", { status: "open" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/parking-lot/organization/org-123",
      { params: { status: "open" } },
    );
  });

  it("uses the canonical /api prefix when updating topic status", () => {
    parkingLotApi.updateTopicStatus("topic-123", { status: "resolved" });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/parking-lot/topic-123/status",
      { status: "resolved" },
    );
  });

  it("uses the canonical /api prefix when assigning topics", () => {
    parkingLotApi.assignTopics({ topicIds: ["topic-1", "topic-2"] });

    expect(apiClient.post).toHaveBeenCalledWith("/api/parking-lot/assign", {
      topicIds: ["topic-1", "topic-2"],
    });
  });

  it("never generates a duplicate /api/api prefix", () => {
    parkingLotApi.addTopic({ title: "No duplicate prefix" });
    parkingLotApi.getOrganizationParkingLot("org-123");
    parkingLotApi.updateTopicStatus("topic-123", { status: "open" });
    parkingLotApi.assignTopics({ topicIds: ["topic-1"] });

    const requestedPaths = [
      ...apiClient.post.mock.calls.map(([path]) => path),
      ...apiClient.get.mock.calls.map(([path]) => path),
      ...apiClient.patch.mock.calls.map(([path]) => path),
    ];

    expect(requestedPaths).toHaveLength(4);
    expect(requestedPaths.every((path) => !path.includes("/api/api/"))).toBe(
      true,
    );
    expect(requestedPaths.every((path) => path.startsWith("/api/"))).toBe(true);
  });
});
