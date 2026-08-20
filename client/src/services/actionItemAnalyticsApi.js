import api from "./apiClient";

const BASE_URL = "/action-item-analytics";

export const actionItemAnalyticsApi = {
  getCompletionMetrics: async (startDate, endDate) => {
    const response = await api.get(`${BASE_URL}/completion-metrics`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getAssigneeLeaderboards: async (startDate, endDate) => {
    const response = await api.get(`${BASE_URL}/assignee-leaderboards`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPriorityBreakdowns: async (startDate, endDate) => {
    const response = await api.get(`${BASE_URL}/priority-breakdowns`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getOverdueTrends: async (startDate, endDate) => {
    const response = await api.get(`${BASE_URL}/overdue-trends`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getMeetingEffectiveness: async (startDate, endDate) => {
    const response = await api.get(`${BASE_URL}/meeting-effectiveness`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};
