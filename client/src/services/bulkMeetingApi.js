import axiosInstance from "./apiClient.js";

const BASE_URL = "/api/bulk/meetings";

const bulkMeetingApi = {
  bulkArchive: (meetingIds) =>
    axiosInstance.post(`${BASE_URL}/archive`, { meetingIds }),

  bulkTag: (meetingIds, tags) =>
    axiosInstance.post(`${BASE_URL}/tag`, { meetingIds, tags }),

  bulkSoftDelete: (meetingIds) =>
    axiosInstance.post(`${BASE_URL}/delete`, { meetingIds }),

  bulkRestore: (meetingIds) =>
    axiosInstance.post(`${BASE_URL}/restore`, { meetingIds }),

  bulkExport: (meetingIds, format = "md") =>
    axiosInstance.post(
      `${BASE_URL}/export`,
      { meetingIds, format },
      { responseType: "blob" },
    ),
};

export default bulkMeetingApi;
