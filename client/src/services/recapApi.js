import axios from "axios";

// Base URL for the recap API routes
const API_URL = "/api/recap";

/**
 * Fetch current user's recap preferences
 */
export const getRecapPreferences = async () => {
  const response = await axios.get(`${API_URL}/preferences`);
  return response.data;
};

/**
 * Update current user's recap preferences
 */
export const updateRecapPreferences = async (preferencesData) => {
  const response = await axios.put(`${API_URL}/preferences`, preferencesData);
  return response.data;
};

/**
 * Preview the recap email with current unsaved preferences
 * Returns raw HTML string
 */
export const previewRecapEmail = async (preferencesData) => {
  const response = await axios.post(`${API_URL}/preview`, preferencesData, {
    responseType: "text", // Since the endpoint returns raw HTML
  });
  return response.data;
};
