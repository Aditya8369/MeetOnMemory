import { describe, it, expect, vi, beforeEach } from "vitest";
import { schedulerApi } from "../schedulerApi";
import apiClient from "../apiClient";

vi.mock("../apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("schedulerApi (#1530)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts proposals to /api/scheduler/propose", async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    await schedulerApi.createProposal({ title: "X" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/scheduler/propose", {
      title: "X",
    });
  });

  it("confirms with proposal id in the path", async () => {
    apiClient.put.mockResolvedValue({ data: { success: true } });
    await schedulerApi.confirmProposal("abc123", {
      startTime: "t1",
      endTime: "t2",
    });
    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/scheduler/propose/abc123/confirm",
      { startTime: "t1", endTime: "t2" },
    );
  });

  it("gets a proposal by id", async () => {
    apiClient.get.mockResolvedValue({ data: { success: true } });
    await schedulerApi.getProposal("abc123");
    expect(apiClient.get).toHaveBeenCalledWith("/api/scheduler/propose/abc123");
  });
});
