import api from "./apiClient.js";

export const generateBriefing = async (meetingId) => {
  const response = await api.post(`/api/briefings/${meetingId}/generate`);
  return response.data;
};

export const getBriefing = async (meetingId) => {
  const response = await api.get(`/api/briefings/${meetingId}`);
  return response.data;
};
