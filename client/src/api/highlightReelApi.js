import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const highlightReelApi = {
  /**
   * Triggers the generation of the highlight reel
   */
  generateHighlightReel: (meetingId) => {
    return axios.post(
      `${API_URL}/meetings/${meetingId}/highlight-reel/generate`,
      {},
      {
        withCredentials: true,
      },
    );
  },

  /**
   * Fetches the current highlight reel
   */
  getHighlightReel: (meetingId) => {
    return axios.get(`${API_URL}/meetings/${meetingId}/highlight-reel`, {
      withCredentials: true,
    });
  },

  /**
   * Exports the highlight reel to HTML
   */
  exportHighlightReelHtml: (meetingId) => {
    return axios.get(`${API_URL}/meetings/${meetingId}/highlight-reel/export`, {
      withCredentials: true,
      responseType: "blob",
    });
  },
};

export default highlightReelApi;
