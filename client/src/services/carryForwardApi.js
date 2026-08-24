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

  getMeetingPreview: (meetingId) =>
    api.get(`/meetings/${meetingId}/carry-forward/preview`),

  applyMeetingCarryForward: (meetingId, seriesId) =>
    api.post(`/meetings/${meetingId}/carry-forward/apply`, { seriesId }),

  getHistory: (seriesId) =>
    api.get(`/series/${seriesId}/carry-forward/history`),
};

export default carryForwardApi;
