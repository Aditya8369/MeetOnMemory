import apiClient from "./apiClient";

export const skillEndorsementApi = {
  createEndorsement: (data) => apiClient.post("/api/skill-endorsements", data),

  getMeetingEndorsements: (meetingId) =>
    apiClient.get(`/api/skill-endorsements/meeting/${meetingId}`),

  getUserEndorsements: (userId) =>
    apiClient.get(`/api/skill-endorsements/user/${userId}`),
};

export default skillEndorsementApi;
