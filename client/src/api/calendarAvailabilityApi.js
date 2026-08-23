import apiClient from "../services/apiClient";

export const calendarAvailabilityApi = {
  getFreeBusy: async ({ attendeeEmails, timeMin, timeMax }) => {
    const response = await apiClient.post("/api/calendar/freebusy", {
      attendeeEmails,
      timeMin,
      timeMax,
    });
    return response.data;
  },
};
