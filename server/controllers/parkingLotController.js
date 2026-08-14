import * as parkingLotService from "../services/parkingLotService.js";

/**
 * Add a topic to the parking lot
 * POST /api/v1/parking-lot
 */
export const addTopic = async (req, res, next) => {
  try {
    const { organizationId, sourceMeetingId, topic } = req.body;
    const userId = req.user._id; // Assuming authMiddleware sets req.user

    if (!organizationId || !sourceMeetingId || !topic) {
      return res.status(400).json({
        success: false,
        message: "Organization ID, Meeting ID, and Topic are required.",
      });
    }

    const item = await parkingLotService.addTopicToParkingLot(
      organizationId,
      sourceMeetingId,
      userId,
      topic,
    );

    res.status(201).json({
      success: true,
      message: "Topic added to parking lot successfully",
      item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get parking lot items for an organization
 * GET /api/v1/parking-lot/organization/:orgId
 */
export const getOrganizationParkingLot = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { status, page, limit } = req.query;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const result = await parkingLotService.getParkingLotForOrganization(orgId, {
      status,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a topic's status
 * PATCH /api/v1/parking-lot/:id/status
 */
export const updateTopicStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, scheduledForMeetingId } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    const updatedItem = await parkingLotService.updateTopicStatus(
      id,
      status,
      scheduledForMeetingId,
    );

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: "Parking lot item not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Topic status updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign multiple topics to a meeting
 * POST /api/v1/parking-lot/assign
 */
export const assignTopics = async (req, res, next) => {
  try {
    const { topicIds, meetingId } = req.body;

    if (!topicIds || !Array.isArray(topicIds) || !meetingId) {
      return res.status(400).json({
        success: false,
        message: "An array of topicIds and a meetingId are required.",
      });
    }

    const items = await parkingLotService.assignTopicsToMeeting(
      topicIds,
      meetingId,
    );

    res.status(200).json({
      success: true,
      message: "Topics assigned successfully",
      items,
    });
  } catch (error) {
    next(error);
  }
};
