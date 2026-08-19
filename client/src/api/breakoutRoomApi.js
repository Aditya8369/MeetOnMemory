import api from "./api.js";

export const breakoutRoomApi = {
  createRoom: async (meetingId, name) => {
    const response = await api.post(
      `/api/meetings/${meetingId}/breakout-rooms`,
      { name },
    );
    return response.data;
  },

  getRooms: async (meetingId) => {
    const response = await api.get(`/api/meetings/${meetingId}/breakout-rooms`);
    return response.data;
  },

  assignParticipants: async (meetingId, roomId, participantIds) => {
    const response = await api.put(
      `/api/meetings/${meetingId}/breakout-rooms/${roomId}/participants`,
      { participantIds },
    );
    return response.data;
  },

  startRoom: async (meetingId, roomId) => {
    const response = await api.post(
      `/api/meetings/${meetingId}/breakout-rooms/${roomId}/start`,
    );
    return response.data;
  },

  closeRoom: async (meetingId, roomId) => {
    const response = await api.post(
      `/api/meetings/${meetingId}/breakout-rooms/${roomId}/close`,
    );
    return response.data;
  },
};
