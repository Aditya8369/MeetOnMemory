import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../apiClient";
import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getEscalationDashboardMetrics,
} from "../escalationApi";

vi.mock("../apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("escalationApi endpoint contract (#1876)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the canonical /api prefix for escalation policies", async () => {
    apiClient.get.mockResolvedValue({ data: { data: [] } });

    await getPolicies("org-123");

    expect(apiClient.get).toHaveBeenCalledWith("/api/escalations", {
      params: { organizationId: "org-123" },
    });
  });

  it("uses the canonical /api prefix for policy mutations", async () => {
    apiClient.post.mockResolvedValue({ data: { data: {} } });
    apiClient.put.mockResolvedValue({ data: { data: {} } });
    apiClient.delete.mockResolvedValue({ data: { data: {} } });

    await createPolicy({ organization: "org-123" });
    await updatePolicy("policy-123", { isActive: true });
    await deletePolicy("policy-123");

    expect(apiClient.post).toHaveBeenCalledWith("/api/escalations", {
      organization: "org-123",
    });
    expect(apiClient.put).toHaveBeenCalledWith("/api/escalations/policy-123", {
      isActive: true,
    });
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/api/escalations/policy-123",
    );
  });

  it("uses the canonical /api prefix for dashboard metrics", async () => {
    apiClient.get.mockResolvedValue({ data: { data: {} } });

    await getEscalationDashboardMetrics("org-123");

    expect(apiClient.get).toHaveBeenCalledWith("/api/escalations/dashboard", {
      params: { organizationId: "org-123" },
    });
  });
});
