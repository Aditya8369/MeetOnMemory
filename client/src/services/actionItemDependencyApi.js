import apiClient from "./apiClient";

export const actionItemDependencyApi = {
  getDependencies: (itemId) =>
    apiClient.get(`/api/action-item-dependencies/${itemId}`),

  addDependency: (dependentId, blockerId) =>
    apiClient.post("/api/action-item-dependencies", { dependentId, blockerId }),

  removeDependency: (dependentId, blockerId) =>
    apiClient.delete(
      `/api/action-item-dependencies/${dependentId}/${blockerId}`,
    ),
};
