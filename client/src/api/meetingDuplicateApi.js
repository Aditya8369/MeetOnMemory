import axios from "axios";

const detectDuplicates = async (meetingId) => {
  return axios.get(`/api/meetings/${meetingId}/duplicates`);
};

const mergeMeetings = async (primaryId, secondaryId) => {
  return axios.post(`/api/meetings/${primaryId}/duplicates/merge`, {
    secondaryId,
  });
};

const dismissDuplicate = async (primaryId, secondaryId) => {
  return axios.post(`/api/meetings/${primaryId}/duplicates`, {
    secondaryId,
  });
};

export const meetingDuplicateApi = {
  detectDuplicates,
  mergeMeetings,
  dismissDuplicate,
};
