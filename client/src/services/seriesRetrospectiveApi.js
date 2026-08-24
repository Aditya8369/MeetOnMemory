import apiClient from "./apiClient.js";

const BASE_URL = "/api/meeting-series";

export const getSeriesRetrospectiveOverview = async (seriesId) => {
  const response = await apiClient.get(
    `${BASE_URL}/${seriesId}/retrospective/overview`,
  );
  return response.data;
};

export const getSeriesRetrospectiveTopics = async (seriesId) => {
  const response = await apiClient.get(
    `${BASE_URL}/${seriesId}/retrospective/topics`,
  );
  return response.data;
};

export const getSeriesRetrospectiveActionItems = async (seriesId) => {
  const response = await apiClient.get(
    `${BASE_URL}/${seriesId}/retrospective/action-items`,
  );
  return response.data;
};

export const getSeriesRetrospectiveAttendance = async (seriesId) => {
  const response = await apiClient.get(
    `${BASE_URL}/${seriesId}/retrospective/attendance`,
  );
  return response.data;
};

export const getSeriesRetrospectiveSentiment = async (seriesId) => {
  const response = await apiClient.get(
    `${BASE_URL}/${seriesId}/retrospective/sentiment`,
  );
  return response.data;
};

export const getSeriesRetrospectiveDecisions = async (seriesId) => {
  const response = await apiClient.get(
    `${BASE_URL}/${seriesId}/retrospective/decisions`,
  );
  return response.data;
};
