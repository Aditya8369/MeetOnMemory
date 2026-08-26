import apiClient from "./apiClient.js";

export const savedFilterApi = {
  createFilter: (data) => apiClient.post("/api/saved-filters", data),
  getFilters: () => apiClient.get("/api/saved-filters"),
  updateFilter: (id, data) => apiClient.put(`/api/saved-filters/${id}`, data),
  deleteFilter: (id) => apiClient.delete(`/api/saved-filters/${id}`),
  togglePin: (id, isPinned) =>
    apiClient.put(`/api/saved-filters/${id}/pin`, { isPinned }),
};
