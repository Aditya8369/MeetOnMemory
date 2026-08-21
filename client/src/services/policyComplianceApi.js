import apiClient from "./apiClient.js";

export const policyComplianceApi = {
  getFlags: (status = "unresolved", classification = "all") =>
    apiClient.get(
      `/api/policy-compliance/flags?status=${status}&classification=${classification}`,
    ),
  getDecisionCompliance: (decisionId) =>
    apiClient.get(`/api/policy-compliance/decisions/${decisionId}`),
  getPolicyRelatedDecisions: (policyId) =>
    apiClient.get(
      `/api/policy-compliance/policies/${policyId}/related-decisions`,
    ),
  updateFlagStatus: (flagId, status) =>
    apiClient.patch(`/api/policy-compliance/flags/${flagId}`, { status }),
  reEvaluate: (flagId) =>
    apiClient.post("/api/policy-compliance/re-evaluate", { flagId }),
};
