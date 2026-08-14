import apiClient from "./apiClient";

export const parkingLotApi = {
  addTopic: (data) => apiClient.post("/parking-lot", data),
  getOrganizationParkingLot: (orgId, params) =>
    apiClient.get(`/parking-lot/organization/${orgId}`, { params }),
  updateTopicStatus: (id, data) =>
    apiClient.patch(`/parking-lot/${id}/status`, data),
  assignTopics: (data) => apiClient.post("/parking-lot/assign", data),
};
