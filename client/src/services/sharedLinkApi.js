import apiClient from "./apiClient";

export const sharedLinkApi = {
  createLink: (data) => apiClient.post("/api/shared-links", data),
  getActiveLinks: (resourceType, resourceId) =>
    apiClient.get(`/api/shared-links/${resourceType}/${resourceId}`),
  revokeLink: (id) => apiClient.delete(`/api/shared-links/${id}`),
};

export const publicSharedApi = {
  verifyPasscode: (hash, data) =>
    apiClient.post(`/api/public/shared/${hash}/verify`, data),
  getPublicResource: (hash) => apiClient.get(`/api/public/shared/${hash}`),
};
