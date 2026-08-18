import apiClient from "./apiClient.js";

const BASE_URL = "/integrations/notion";

export const notionIntegrationApi = {
  getStatus: () => apiClient.get(`${BASE_URL}/status`),
  getAuthUrl: () => apiClient.get(`${BASE_URL}/auth`),
  getDatabases: () => apiClient.get(`${BASE_URL}/databases`),
  saveMapping: (targetDatabaseId) =>
    apiClient.post(`${BASE_URL}/mapping`, { targetDatabaseId }),
  disconnect: () => apiClient.delete(`${BASE_URL}/disconnect`),
};
