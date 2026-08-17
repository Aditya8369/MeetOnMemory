import apiClient from "./apiClient";

const wrap = async (promise) => {
  const res = await promise;
  const result = res.data;
  if (result && typeof result === "object") {
    Object.defineProperty(result, "data", {
      get() {
        return result;
      },
      configurable: true,
      enumerable: false,
    });
  }
  return result;
};

export const personalNoteApi = {
  getNoteByMeetingId: (meetingId) =>
    wrap(apiClient.get(`/api/personal-notes/${meetingId}`)),

  getByMeetingId: (meetingId) =>
    wrap(apiClient.get(`/api/personal-notes/${meetingId}`)),

  upsertNote: (meetingId, data) => {
    const payload = typeof data === "string" ? { content: data } : data;
    return wrap(apiClient.post(`/api/personal-notes/${meetingId}`, payload));
  },

  addAnnotation: (meetingId, annotationData) =>
    wrap(
      apiClient.post(
        `/api/personal-notes/${meetingId}/annotations`,
        annotationData,
      ),
    ),

  removeAnnotation: (meetingId, annotationId) =>
    wrap(
      apiClient.delete(
        `/api/personal-notes/${meetingId}/annotations/${annotationId}`,
      ),
    ),

  togglePin: (meetingId, isPinned) =>
    wrap(apiClient.patch(`/api/personal-notes/${meetingId}/pin`, { isPinned })),

  getPinnedNotes: () => wrap(apiClient.get(`/api/personal-notes/pinned`)),

  searchNotes: (query) =>
    wrap(apiClient.get(`/api/personal-notes/search`, { params: { q: query } })),

  clearNoteContent: (meetingId) =>
    wrap(apiClient.put(`/api/personal-notes/${meetingId}/clear`)),

  deleteNote: (meetingId) =>
    wrap(apiClient.delete(`/api/personal-notes/${meetingId}`)),
};
