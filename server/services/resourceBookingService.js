import PhysicalResource from "../models/physicalResourceModel.js";
import ResourceBooking from "../models/resourceBookingModel.js";

class ResourceBookingService {
  /**
   * Check if a resource is available for a given time window.
   */
  async checkAvailability(
    resourceId,
    startTime,
    endTime,
    excludeBookingId = null,
  ) {
    const query = {
      resourceId,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const conflictingBooking = await ResourceBooking.findOne(query);
    return !conflictingBooking;
  }

  /**
   * Get all available resources of a specific type in an organization during a time window.
   */
  async getAvailableResources(organizationId, startTime, endTime, type = null) {
    const resourceQuery = { organization: organizationId };
    if (type) {
      resourceQuery.type = type;
    }

    const resources = await PhysicalResource.find(resourceQuery);
    const availableResources = [];

    for (const resource of resources) {
      const isAvailable = await this.checkAvailability(
        resource._id,
        startTime,
        endTime,
      );
      if (isAvailable) {
        availableResources.push(resource);
      }
    }

    return availableResources;
  }

  /**
   * Create a new resource booking.
   */
  async createBooking(
    resourceId,
    meetingId,
    startTime,
    endTime,
    organizationId,
  ) {
    const isAvailable = await this.checkAvailability(
      resourceId,
      startTime,
      endTime,
    );
    if (!isAvailable) {
      throw new Error("Resource is not available during the requested time.");
    }

    const booking = new ResourceBooking({
      resourceId,
      meetingId,
      startTime,
      endTime,
      organization: organizationId,
    });

    return await booking.save();
  }

  /**
   * Cancel (delete) a booking.
   */
  async cancelBooking(bookingId) {
    return await ResourceBooking.findByIdAndDelete(bookingId);
  }

  /**
   * Get bookings for a specific meeting.
   */
  async getBookingsForMeeting(meetingId) {
    return await ResourceBooking.find({ meetingId }).populate("resourceId");
  }

  /**
   * Get all physical resources for an organization.
   */
  async getPhysicalResources(organizationId) {
    return await PhysicalResource.find({ organization: organizationId });
  }

  /**
   * Create a physical resource.
   */
  async createPhysicalResource(data) {
    const resource = new PhysicalResource(data);
    return await resource.save();
  }
}

export default new ResourceBookingService();
