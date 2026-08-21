import apiClient from "./apiClient.js";

const BASE_URL = `/api/data-retention`;

export const getPolicy = async (organizationId) => {
  const response = await apiClient.get(`${BASE_URL}/${organizationId}`);
  return response.data;
};

export const updatePolicy = async (organizationId, updateData) => {
  const response = await apiClient.put(
    `${BASE_URL}/${organizationId}`,
    updateData,
  );
  return response.data;
};

export const getSweepPreview = async (organizationId) => {
  const response = await apiClient.get(`${BASE_URL}/${organizationId}/preview`);
  return response.data;
};

export const triggerSweep = async (organizationId) => {
  const response = await apiClient.post(
    `${BASE_URL}/${organizationId}/trigger`,
  );
  return response.data;
};
