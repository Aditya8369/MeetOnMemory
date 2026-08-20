import mongoose from "mongoose";
import * as parkingLotService from "../services/parkingLotService.js";
import ParkingLotItem from "../models/parkingLotItemModel.js";
import Meeting from "../models/meetingModel.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

/**
 * Add a topic to the parking lot
 * POST /api/v1/parking-lot
 */
export const addTopic = async (req, res, next) => {
  try {
    const { organizationId, sourceMeetingId, topic } = req.body;
    const userId = req.user._id || req.user.id;
    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!userOrgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    if (!sourceMeetingId || !topic) {
      return res.status(400).json({
        success: false,
        message: "Organization ID, Meeting ID, and Topic are required.",
      });
    }

    if (organizationId && organizationId.toString() !== userOrgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cross-organization access denied",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(sourceMeetingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID format",
      });
    }

    const meeting = await Meeting.findById(sourceMeetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (!canAccessMeetingDoc(meeting, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this meeting",
      });
    }

    const item = await parkingLotService.addTopicToParkingLot(
      userOrgId,
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
    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!userOrgId || orgId.toString() !== userOrgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cross-organization access denied",
      });
    }

    const result = await parkingLotService.getParkingLotForOrganization(
      userOrgId,
      {
        status,
        page,
        limit,
      },
    );

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
    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid topic ID format",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    const item = await ParkingLotItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Parking lot item not found.",
      });
    }

    if (!userOrgId || item.organization?.toString() !== userOrgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cross-organization access denied",
      });
    }

    if (scheduledForMeetingId) {
      if (!mongoose.Types.ObjectId.isValid(scheduledForMeetingId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid meeting ID format",
        });
      }
      const meeting = await Meeting.findById(scheduledForMeetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: "Scheduled meeting not found",
        });
      }
      if (!canAccessMeetingDoc(meeting, req.user)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You don't have access to this meeting",
        });
      }
    }

    const updatedItem = await parkingLotService.updateTopicStatus(
      id,
      status,
      scheduledForMeetingId,
    );

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
    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!topicIds || !Array.isArray(topicIds) || !meetingId) {
      return res.status(400).json({
        success: false,
        message: "An array of topicIds and a meetingId are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID format",
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (!canAccessMeetingDoc(meeting, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this meeting",
      });
    }

    const validTopicIds = topicIds.filter((tid) =>
      mongoose.Types.ObjectId.isValid(tid),
    );
    if (validTopicIds.length !== topicIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more topic IDs are invalid format",
      });
    }

    const matchingItems = await ParkingLotItem.find({
      _id: { $in: validTopicIds },
      organization: userOrgId,
    });

    if (matchingItems.length !== topicIds.length) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: One or more topics do not belong to your organization",
      });
    }

    const items = await parkingLotService.assignTopicsToMeeting(
      validTopicIds,
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
