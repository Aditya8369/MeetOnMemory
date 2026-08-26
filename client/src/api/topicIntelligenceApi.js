import apiClient from "../services/apiClient.js";

export const getDashboardData = async () => {
  const { data } = await apiClient.get("/api/topic-intelligence/dashboard");
  return data;
};

export const getOrphanedTopics = async () => {
  const { data } = await apiClient.get("/api/topic-intelligence/orphaned");
  return data;
};

export const getCoOccurrenceGraph = async () => {
  const { data } = await apiClient.get("/api/topic-intelligence/graph");
  return data;
};

export const generateBriefing = async (clusterId) => {
  const { data } = await apiClient.post(
    `/api/topic-intelligence/${clusterId}/briefing`,
  );
  return data;
};
