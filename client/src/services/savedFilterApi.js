import apiClient from "./apiClient";

export const savedFilterApi = {
  createFilter: (data) => apiClient.post("/saved-filters", data),
  getFilters: () => apiClient.get("/saved-filters"),
  updateFilter: (id, data) => apiClient.put(`/saved-filters/${id}`, data),
  deleteFilter: (id) => apiClient.delete(`/saved-filters/${id}`),
  togglePin: (id, isPinned) =>
    apiClient.put(`/saved-filters/${id}/pin`, { isPinned }),
};
