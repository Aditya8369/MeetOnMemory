import { describe, expect, it, vi, beforeEach } from "vitest";
import { policyComplianceApi } from "../policyComplianceApi.js";
import apiClient from "../apiClient.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe("policyComplianceApi re-evaluation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queues a compliance re-evaluation through the canonical endpoint", async () => {
    apiClient.post.mockResolvedValue({ data: { success: true, queued: true } });

    await policyComplianceApi.reEvaluate("flag-123");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/policy-compliance/re-evaluate",
      { flagId: "flag-123" },
    );
  });
});
