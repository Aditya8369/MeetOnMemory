import mongoose from "mongoose";
import ParkingLotItem from "../models/parkingLotItemModel.js";

/**
 * Add a new topic to the parking lot
 */
export const addTopicToParkingLot = async (
  organizationId,
  sourceMeetingId,
  userId,
  topic,
) => {
  const item = new ParkingLotItem({
    organization: organizationId,
    sourceMeetingId,
    submittedBy: userId,
    topic,
  });

  await item.save();

  // Populate basic info for response
  await item.populate("submittedBy", "name avatarUrl");
  await item.populate("sourceMeetingId", "title startTime");

  return item;
};

/**
 * Get parking lot items for an organization
 */
export const getParkingLotForOrganization = async (
  organizationId,
  filters = {},
) => {
  const { status, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const query = { organization: organizationId };
  if (status) {
    query.status = status;
  }

  const [items, total] = await Promise.all([
    ParkingLotItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("submittedBy", "name avatarUrl")
      .populate("sourceMeetingId", "title startTime")
      .populate("scheduledForMeetingId", "title startTime")
      .lean(),
    ParkingLotItem.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Update a parking lot item's status
 */
export const updateTopicStatus = async (
  topicId,
  status,
  scheduledForMeetingId = null,
) => {
  const updateData = { status };
  if (scheduledForMeetingId) {
    updateData.scheduledForMeetingId = scheduledForMeetingId;
  }

  const updatedItem = await ParkingLotItem.findByIdAndUpdate(
    topicId,
    updateData,
    { new: true },
  )
    .populate("submittedBy", "name avatarUrl")
    .populate("sourceMeetingId", "title startTime")
    .populate("scheduledForMeetingId", "title startTime");

  return updatedItem;
};

/**
 * Assign multiple topics to a meeting at once
 */
export const assignTopicsToMeeting = async (topicIds, meetingId) => {
  if (!topicIds || !topicIds.length) return [];

  await ParkingLotItem.updateMany(
    { _id: { $in: topicIds } },
    {
      $set: {
        status: "scheduled",
        scheduledForMeetingId: meetingId,
      },
    },
  );

  const updatedItems = await ParkingLotItem.find({ _id: { $in: topicIds } })
    .populate("submittedBy", "name avatarUrl")
    .populate("sourceMeetingId", "title startTime")
    .populate("scheduledForMeetingId", "title startTime")
    .lean();

  return updatedItems;
};
