import apiClient from "./apiClient.js";

/**
 * Highlight Reel API Service
 * Uses the application's central apiClient instance (ensuring port 4000 resolution
 * and automatic Clerk Bearer token injection).
 */
const highlightReelApi = {
  /**
   * Triggers the generation of the highlight reel
   * @param {string} meetingId - Meeting ID
   */
  generateHighlightReel: (meetingId) => {
    return apiClient.post(`/api/meetings/${meetingId}/highlight-reel/generate`);
  },

  /**
   * Fetches the current highlight reel
   * @param {string} meetingId - Meeting ID
   */
  getHighlightReel: (meetingId) => {
    return apiClient.get(`/api/meetings/${meetingId}/highlight-reel`);
  },

  /**
   * Exports the highlight reel to HTML
   * @param {string} meetingId - Meeting ID
   */
  exportHighlightReelHtml: (meetingId) => {
    return apiClient.get(`/api/meetings/${meetingId}/highlight-reel/export`, {
      responseType: "blob",
    });
  },
};

export default highlightReelApi;
