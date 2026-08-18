import apiClient from "./apiClient";

export const getPolicies = async (organizationId) => {
  const { data } = await apiClient.get(`/escalations`, {
    params: { organizationId },
  });
  return data.data;
};

export const createPolicy = async (policyData) => {
  const { data } = await apiClient.post(`/escalations`, policyData);
  return data.data;
};

export const updatePolicy = async (policyId, policyData) => {
  const { data } = await apiClient.put(`/escalations/${policyId}`, policyData);
  return data.data;
};

export const deletePolicy = async (policyId) => {
  const { data } = await apiClient.delete(`/escalations/${policyId}`);
  return data.data;
};

export const getEscalationDashboardMetrics = async (organizationId) => {
  const { data } = await apiClient.get(`/escalations/dashboard`, {
    params: { organizationId },
  });
  return data.data;
};
