import api from "./apiClient.js";

const teamAvailabilityApi = {
  getPreferences: async () => {
    const response = await api.get("/api/team-availability/preferences");
    return response.data;
  },

  updatePreferences: async (preferences) => {
    const response = await api.put(
      "/api/team-availability/preferences",
      preferences,
    );
    return response.data;
  },

  getHeatmapData: async (startDate, endDate) => {
    const response = await api.get("/api/team-availability/heatmap", {
      params: { startDate, endDate },
    });
    return response.data;
  },

  findFreeSlots: async (userIds, durationMinutes, startDate, endDate) => {
    const response = await api.post("/api/team-availability/free-slots", {
      userIds,
      durationMinutes,
      startDate,
      endDate,
    });
    return response.data;
  },

  getLoadDistribution: async (startDate, endDate) => {
    const response = await api.get("/api/team-availability/load-distribution", {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

export default teamAvailabilityApi;
