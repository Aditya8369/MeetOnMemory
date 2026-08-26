import apiClient from "./apiClient";

export const adminHealthApi = {
  getReport: () => apiClient.get("/api/admin/health"),
};

export default adminHealthApi;
