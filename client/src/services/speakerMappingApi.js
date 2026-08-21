import api from "./apiClient";

export const speakerMappingApi = {
  getMappings: (meetingId) => api.get(`/api/speaker-mapping/${meetingId}`),

  suggestMappings: (meetingId) =>
    api.get(`/api/speaker-mapping/${meetingId}/suggest`),

  saveAndApplyMapping: (meetingId, originalLabel, mappedName) =>
    api.post(`/api/speaker-mapping/${meetingId}`, {
      originalLabel,
      mappedName,
    }),

  revertMapping: (meetingId, mappingId) =>
    api.delete(`/api/speaker-mapping/${meetingId}/${mappingId}`),
};
