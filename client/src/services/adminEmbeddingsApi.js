import apiClient from "./apiClient";

export const adminEmbeddingsApi = {
  listStatus: (params) => apiClient.get("/api/admin/embeddings", { params }),
  getJobStatus: (jobId) =>
    apiClient.get(`/api/admin/embeddings/jobs/${encodeURIComponent(jobId)}`),
  reindexMeeting: (meetingId) =>
    apiClient.post(
      `/api/admin/embeddings/reindex/meeting/${encodeURIComponent(meetingId)}`,
    ),
  reindexOrg: () => apiClient.post("/api/admin/embeddings/reindex/org"),
};
