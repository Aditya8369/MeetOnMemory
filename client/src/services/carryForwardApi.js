import api from "./apiClient.js";

const carryForwardApi = {
  getConfig: (seriesId) =>
    api.get(`/meeting-series/${seriesId}/carry-forward/config`),

  updateConfig: (seriesId, carryForwardRules) =>
    api.put(`/meeting-series/${seriesId}/carry-forward/config`, {
      carryForwardRules,
    }),

  getPreview: (seriesId) =>
    api.get(`/meeting-series/${seriesId}/carry-forward/preview`),

  applyCarryForward: (seriesId, currentMeetingId) =>
    api.post(`/meeting-series/${seriesId}/carry-forward/apply`, {
      currentMeetingId,
    }),
};

export default carryForwardApi;
