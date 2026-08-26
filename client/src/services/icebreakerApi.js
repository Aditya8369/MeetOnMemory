import api from "./apiClient"; // Ensure we use the pre-configured axios instance

export const generateIcebreakers = async (meetingId, participantIds = []) => {
  const response = await api.post("/icebreakers/generate", {
    meetingId,
    participantIds,
  });
  return response.data; // { icebreakers: [...] }
};

export const selectIcebreaker = async (meetingId, category, promptText) => {
  const response = await api.post("/icebreakers/select", {
    meetingId,
    category,
    promptText,
  });
  return response.data;
};
