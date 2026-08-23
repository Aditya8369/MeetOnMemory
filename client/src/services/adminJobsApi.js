import apiClient from "./apiClient";

export const adminJobsApi = {
  getDashboard: (params) => apiClient.get("/api/admin/jobs", { params }),
  retryJob: (queueName, jobId) =>
    apiClient.post(
      `/api/admin/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/retry`,
    ),
  discardJob: (queueName, jobId) =>
    apiClient.delete(
      `/api/admin/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`,
    ),
};
