import apiClient from "./apiClient";

export const effectivenessApi = {
  calculateMeetingScore: async (meetingId, organizationId, seriesId) => {
    const response = await apiClient.post(
      `/effectiveness/calculate/${meetingId}`,
      {
        organizationId,
        seriesId,
      },
    );
    return response.data;
  },

  getMeetingScore: async (meetingId) => {
    const response = await apiClient.get(`/effectiveness/meeting/${meetingId}`);
    return response.data;
  },

  getOrganizationTrends: async (organizationId, days = 30) => {
    const response = await apiClient.get(
      `/effectiveness/organization/${organizationId}`,
      {
        params: { days },
      },
    );
    return response.data;
  },

  getSeriesTrends: async (seriesId, limit = 10) => {
    const response = await apiClient.get(`/effectiveness/series/${seriesId}`, {
      params: { limit },
    });
    return response.data;
  },
};
