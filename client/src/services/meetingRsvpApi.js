import api from "./apiClient.js";

const meetingRsvpApi = {
  /**
   * Get pending RSVPs for the logged-in user
   * @returns {Promise<Object>} Response data
   */
  getPendingRsvps: async () => {
    return await api.get("/api/rsvps/pending");
  },

  /**
   * Get the RSVP summary for a specific meeting
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Object>} Response data
   */
  getMeetingSummary: async (meetingId) => {
    return await api.get(`/api/rsvps/meeting/${meetingId}`);
  },

  /**
   * Send RSVP requests to participants
   * @param {string} meetingId - Meeting ID
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<Object>} Response data
   */
  sendRsvpRequests: async (meetingId, userIds) => {
    return await api.post(`/api/rsvps/send/${meetingId}`, { userIds });
  },

  /**
   * Respond to an RSVP request
   * @param {string} meetingId - Meeting ID
   * @param {Object} responseData - { status, declineReason, availabilityNote }
   * @returns {Promise<Object>} Response data
   */
  respondToRsvp: async (meetingId, responseData) => {
    return await api.put(`/api/rsvps/${meetingId}/respond`, responseData);
  },
};

export default meetingRsvpApi;
