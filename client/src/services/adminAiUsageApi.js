import apiClient from "./apiClient";

export const adminAiUsageApi = {
  getMetrics: (params) => apiClient.get("/api/admin/ai-usage", { params }),
};
