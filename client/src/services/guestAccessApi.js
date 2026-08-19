import apiClient from "./apiClient";

/**
 * Creates a new guest access token for a meeting.
 * @param {String} meetingId
 * @param {Object} data { guestEmail, permissions, expiresAt, maxViews }
 */
export const createGuestToken = async (meetingId, data) => {
  const response = await apiClient.post(
    `/meetings/${meetingId}/guest-tokens`,
    data,
  );
  return response.data;
};

/**
 * Fetches all guest tokens for a meeting.
 * @param {String} meetingId
 */
export const getMeetingGuestTokens = async (meetingId) => {
  const response = await apiClient.get(`/meetings/${meetingId}/guest-tokens`);
  return response.data;
};

/**
 * Revokes a specific guest token.
 * @param {String} tokenId
 */
export const revokeGuestToken = async (tokenId) => {
  const response = await apiClient.post(`/guest-tokens/${tokenId}/revoke`);
  return response.data;
};

/**
 * Unauthenticated: fetches meeting data for a guest token.
 * @param {String} token
 */
export const getGuestMeetingData = async (token) => {
  const response = await apiClient.get(`/guest/meeting/${token}`);
  return response.data;
};

/**
 * Unauthenticated: posts a comment as a guest.
 * @param {String} token
 * @param {Object} commentData { body }
 */
export const addGuestComment = async (token, commentData) => {
  const response = await apiClient.post(
    `/guest/meeting/${token}/comments`,
    commentData,
  );
  return response.data;
};
