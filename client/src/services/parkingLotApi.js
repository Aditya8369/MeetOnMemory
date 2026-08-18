import apiClient from "./apiClient";

const PARKING_LOT_BASE_PATH = "/api/parking-lot";

export const parkingLotApi = {
  addTopic: (data) => apiClient.post(PARKING_LOT_BASE_PATH, data),

  getOrganizationParkingLot: (orgId, params) =>
    apiClient.get(`${PARKING_LOT_BASE_PATH}/organization/${orgId}`, { params }),

  updateTopicStatus: (id, data) =>
    apiClient.patch(`${PARKING_LOT_BASE_PATH}/${id}/status`, data),

  assignTopics: (data) =>
    apiClient.post(`${PARKING_LOT_BASE_PATH}/assign`, data),
};
