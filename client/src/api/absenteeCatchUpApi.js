import apiClient from "../services/apiClient";

export const absenteeCatchUpApi = {
  getPendingCatchUps: async () => {
    const response = await apiClient.get("/absentee-catchup/pending");
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.post(`/absentee-catchup/${id}/mark-read`);
    return response.data;
  },

  deliverCatchUp: async (id) => {
    const response = await apiClient.post(`/absentee-catchup/${id}/deliver`);
    return response.data;
  },
};
