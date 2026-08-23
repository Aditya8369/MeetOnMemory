import apiClient from "./apiClient.js";

export const getLatestInsight = async (orgId) => {
  const response = await apiClient.get(`/weekly-insights/${orgId}/latest`);
  return response.data;
};

export const getInsightHistory = async (orgId, page = 1, limit = 10) => {
  const response = await apiClient.get(`/weekly-insights/${orgId}`, {
    params: { page, limit },
  });
  return response.data;
};

export const triggerManualGeneration = async (orgId) => {
  const response = await apiClient.post(`/weekly-insights/${orgId}/generate`);
  return response.data;
};
