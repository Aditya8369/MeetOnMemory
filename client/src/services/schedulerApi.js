import apiClient from "./apiClient";

const SCHEDULER_URL = "/api/scheduler";

/**
 * Smart Scheduler API (Issue #1530) — matches backend /api/scheduler contract.
 */
export const schedulerApi = {
  createProposal: (payload) =>
    apiClient.post(`${SCHEDULER_URL}/propose`, payload),

  getProposal: (proposalId) =>
    apiClient.get(`${SCHEDULER_URL}/propose/${proposalId}`),

  confirmProposal: (proposalId, { startTime, endTime }) =>
    apiClient.put(`${SCHEDULER_URL}/propose/${proposalId}/confirm`, {
      startTime,
      endTime,
    }),
};

export default schedulerApi;
