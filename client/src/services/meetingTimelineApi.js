import apiClient from "./apiClient.js";

export const meetingTimelineApi = {
  getMeetingTimeline: (meetingId) =>
    apiClient.get(`/api/meetings/${meetingId}/timeline`),
};
