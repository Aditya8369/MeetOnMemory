import api from "./apiClient";

const getChecklist = async (meetingId) => {
  return await api.get(`/api/meetings/${meetingId}/checklist`);
};

const createChecklist = async (meetingId, checklistData) => {
  return await api.post(`/api/meetings/${meetingId}/checklist`, checklistData);
};

const updateChecklist = async (meetingId, checklistData) => {
  return await api.put(`/api/meetings/${meetingId}/checklist`, checklistData);
};

const deleteChecklist = async (meetingId) => {
  return await api.delete(`/api/meetings/${meetingId}/checklist`);
};

const toggleItem = async (meetingId, itemIndex) => {
  return await api.patch(`/api/meetings/${meetingId}/checklist/toggle`, {
    itemIndex,
  });
};

const getReadiness = async (meetingId) => {
  return await api.get(`/api/meetings/${meetingId}/checklist/readiness`);
};

export const meetingChecklistApi = {
  getChecklist,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  toggleItem,
  getReadiness,
};
