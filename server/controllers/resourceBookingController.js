import resourceBookingService from "../services/resourceBookingService.js";

// Fetch physical resources for an organization
export const getPhysicalResources = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const resources =
      await resourceBookingService.getPhysicalResources(organizationId);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch physical resources",
      error: error.message,
    });
  }
};

// Create a physical resource
export const createPhysicalResource = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const data = { ...req.body, organization: organizationId };
    const resource = await resourceBookingService.createPhysicalResource(data);
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create physical resource",
      error: error.message,
    });
  }
};

// Get available resources for a specific time window
export const getAvailableResources = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { startTime, endTime, type } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "startTime and endTime are required query parameters",
      });
    }

    const availableResources =
      await resourceBookingService.getAvailableResources(
        organizationId,
        new Date(startTime),
        new Date(endTime),
        type,
      );
    res.status(200).json(availableResources);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch available resources",
      error: error.message,
    });
  }
};

// Create a resource booking
export const createBooking = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { resourceId, meetingId, startTime, endTime } = req.body;

    const booking = await resourceBookingService.createBooking(
      resourceId,
      meetingId,
      new Date(startTime),
      new Date(endTime),
      organizationId,
    );
    res.status(201).json(booking);
  } catch (error) {
    if (
      error.message === "Resource is not available during the requested time."
    ) {
      return res.status(409).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Failed to create booking", error: error.message });
  }
};

// Cancel a resource booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    await resourceBookingService.cancelBooking(bookingId);
    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to cancel booking", error: error.message });
  }
};

// Get bookings for a specific meeting
export const getMeetingBookings = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const bookings =
      await resourceBookingService.getBookingsForMeeting(meetingId);
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch meeting bookings",
      error: error.message,
    });
  }
};
