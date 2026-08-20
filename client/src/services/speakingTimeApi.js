import apiClient from "./apiClient";

export const speakingTimeApi = {
  getBreakdown: (meetingId) =>
    apiClient.get(`/speaking-time/${meetingId}/breakdown`),
  getTrends: (limit = 10) =>
    apiClient.get(`/speaking-time/trends?limit=${limit}`),
};

export default speakingTimeApi;
