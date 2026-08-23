import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../apiClient.js";
import {
  getCostConfig,
  updateCostConfig,
  getOrgCostAnalytics,
  getMemberTimeStats,
  exportCostReport,
} from "../meetingCostApi.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("meetingCostApi /api prefix & path shape tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /api/meeting-cost/config for getCostConfig", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { success: true, config: { currency: "USD" } },
    });

    const result = await getCostConfig();

    expect(apiClient.get).toHaveBeenCalledWith("/api/meeting-cost/config");
    expect(result).toEqual({ success: true, config: { currency: "USD" } });
  });

  it("calls PUT /api/meeting-cost/config for updateCostConfig", async () => {
    const payload = { currency: "EUR", defaultHourlyRate: 75 };
    apiClient.put.mockResolvedValueOnce({ data: { success: true } });

    const result = await updateCostConfig(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/meeting-cost/config",
      payload,
    );
    expect(result).toEqual({ success: true });
  });

  it("calls GET /api/meeting-cost/analytics/org for getOrgCostAnalytics", async () => {
    const params = { startDate: "2026-01-01", endDate: "2026-01-31" };
    apiClient.get.mockResolvedValueOnce({
      data: { success: true, data: { totalCost: 1000 } },
    });

    const result = await getOrgCostAnalytics(params);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/meeting-cost/analytics/org",
      {
        params: { startDate: "2026-01-01", endDate: "2026-01-31" },
      },
    );
    expect(result).toEqual({ success: true, data: { totalCost: 1000 } });
  });

  it("calls GET /api/meeting-cost/analytics/members for getMemberTimeStats", async () => {
    const params = { startDate: "2026-01-01" };
    apiClient.get.mockResolvedValueOnce({
      data: { success: true, data: [] },
    });

    const result = await getMemberTimeStats(params);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/meeting-cost/analytics/members",
      { params: { startDate: "2026-01-01" } },
    );
    expect(result).toEqual({ success: true, data: [] });
  });

  it("calls GET /api/meeting-cost/analytics/export with responseType blob for exportCostReport", async () => {
    const params = { startDate: "2026-01-01" };
    apiClient.get.mockResolvedValueOnce({ data: new Blob([]) });

    const result = await exportCostReport(params);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/meeting-cost/analytics/export",
      {
        params: { startDate: "2026-01-01" },
        responseType: "blob",
      },
    );
    expect(result).toBeInstanceOf(Blob);
  });
});
