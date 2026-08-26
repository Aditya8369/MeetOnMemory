import apiClient from "./apiClient";

export const notificationApi = {
  getNotifications: (params) => apiClient.get("/api/notifications", { params }),
  getUnreadCount: () => apiClient.get("/api/notifications/unread-count"),
  markAsRead: (id) => apiClient.patch(`/api/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch("/api/notifications/mark-all-read"),
  markGroupAsRead: (ids) =>
    apiClient.patch("/api/notifications/mark-group-read", { ids }),
  muteMeeting: (meetingId) =>
    apiClient.post(`/api/notifications/mute-meeting/${meetingId}`),
  unmuteMeeting: (meetingId) =>
    apiClient.delete(`/api/notifications/mute-meeting/${meetingId}`),
  deleteNotification: (id) => apiClient.delete(`/api/notifications/${id}`),
  getPreferences: () => apiClient.get("/api/notifications/preferences"),
  updatePreferences: (data) =>
    apiClient.put("/api/notifications/preferences", data),
  getVapidPublicKey: () => apiClient.get("/api/notifications/push/public-key"),
  subscribePush: (subscription) =>
    apiClient.post("/api/notifications/push/subscribe", subscription),
  unsubscribePush: (endpoint) =>
    apiClient.post("/api/notifications/push/unsubscribe", { endpoint }),
  sendTestPush: () => apiClient.post("/api/notifications/push/test"),
};

export default notificationApi;
