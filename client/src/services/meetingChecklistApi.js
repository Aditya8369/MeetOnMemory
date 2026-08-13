import api from "./apiClient";

const getChecklist = async (meetingId) => {
  return await api.get(`/meetings/${meetingId}/checklist`);
};

const createChecklist = async (meetingId, checklistData) => {
  return await api.post(`/meetings/${meetingId}/checklist`, checklistData);
};

const toggleItem = async (meetingId, itemIndex) => {
  return await api.patch(`/meetings/${meetingId}/checklist/toggle`, {
    itemIndex,
  });
};

const getReadiness = async (meetingId) => {
  return await api.get(`/meetings/${meetingId}/checklist/readiness`);
};

export const meetingChecklistApi = {
  getChecklist,
  createChecklist,
  toggleItem,
  getReadiness,
};
