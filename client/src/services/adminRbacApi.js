import apiClient from "./apiClient";

export const adminRbacApi = {
  getMatrix: () => apiClient.get("/api/admin/rbac/matrix"),
};

export default adminRbacApi;
