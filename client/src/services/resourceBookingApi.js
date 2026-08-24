import api from "./apiClient";

export const resourceBookingApi = {
  // Fetch all physical resources for an organization
  getPhysicalResources: async (organizationId) => {
    const response = await api.get(
      `/physical-resources/organization/${organizationId}`,
    );
    return response.data;
  },

  // Create a new physical resource
  createPhysicalResource: async (organizationId, resourceData) => {
    const response = await api.post(
      `/physical-resources/organization/${organizationId}`,
      resourceData,
    );
    return response.data;
  },

  // Get available resources for a time window
  getAvailableResources: async (
    organizationId,
    startTime,
    endTime,
    type = null,
  ) => {
    const params = new URLSearchParams({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
    if (type) params.append("type", type);

    const response = await api.get(
      `/physical-resources/organization/${organizationId}/available?${params.toString()}`,
    );
    return response.data;
  },

  // Book a resource
  createBooking: async (organizationId, bookingData) => {
    const response = await api.post(
      `/physical-resources/organization/${organizationId}/bookings`,
      bookingData,
    );
    return response.data;
  },

  // Cancel a booking
  cancelBooking: async (bookingId) => {
    const response = await api.delete(
      `/physical-resources/bookings/${bookingId}`,
    );
    return response.data;
  },

  // Get bookings for a specific meeting
  getMeetingBookings: async (meetingId) => {
    const response = await api.get(
      `/physical-resources/meetings/${meetingId}/bookings`,
    );
    return response.data;
  },
};

export default resourceBookingApi;
