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

describe("policy compliance evidence APIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests a ZIP evidence package with a long enough timeout", async () => {
    apiClient.get.mockResolvedValue({ data: new Blob(["zip"]) });
    await policyComplianceApi.exportEvidence("flag-1", "zip");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/policy-compliance/flags/flag-1/export?format=zip",
      { responseType: "blob", timeout: 60000 },
    );
  });

  it("requests the exact policy version used by a compliance record", async () => {
    apiClient.get.mockResolvedValue({ data: { success: true } });
    await policyComplianceApi.getPolicyVersion("policy-1", "2.1");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/policy-compliance/policies/policy-1/versions/2.1",
    );
  });
});
