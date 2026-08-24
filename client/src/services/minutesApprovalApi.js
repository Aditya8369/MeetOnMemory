import apiClient from "./apiClient";

export const getApprovalStatus = (meetingId) => {
  return apiClient.get(`/meetings/${meetingId}/minutes-approval`);
};

export const submitApproval = (meetingId, summary, approverIds) => {
  return apiClient.post(`/meetings/${meetingId}/minutes-approval/submit`, {
    summary,
    approverIds,
  });
};

export const respondApproval = (meetingId, status, comment) => {
  return apiClient.put(`/meetings/${meetingId}/minutes-approval/respond`, {
    status,
    comment,
  });
};
