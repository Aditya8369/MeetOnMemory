import apiClient from "./apiClient";

export const favoriteApi = {
  toggleFavorite: (meetingId) =>
    apiClient.post("/api/favorites/toggle", { meetingId }),

  getFavorites: () => apiClient.get("/api/favorites"),

  getFavoriteStatus: (meetingId) =>
    apiClient.get(`/api/favorites/status/${meetingId}`),
};
