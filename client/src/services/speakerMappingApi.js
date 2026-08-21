import api from "./apiClient";

export const speakerMappingApi = {
  getMappings: (meetingId) => api.get(`/api/speaker-mappings/${meetingId}`),

  suggestMappings: (meetingId) =>
    api.get(`/api/speaker-mappings/${meetingId}/suggest`),

  saveAndApplyMapping: (meetingId, originalLabel, mappedName) =>
    api.post(`/api/speaker-mappings/${meetingId}`, { originalLabel, mappedName }),

  revertMapping: (meetingId, mappingId) =>
    api.delete(`/api/speaker-mappings/${meetingId}/${mappingId}`),
};
