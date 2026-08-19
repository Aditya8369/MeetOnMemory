import MeetingRsvp from "../models/meetingRsvpModel.js";
import Meeting from "../models/meetingModel.js";

/**
 * Initializes RSVP requests for a meeting's participants
 * @param {string} meetingId - The ID of the meeting
 * @param {Array<string>} userIds - Array of user IDs to send RSVPs to
 * @returns {Promise<Array>} Array of created RSVP records
 */
export const initializeRsvps = async (meetingId, userIds) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const existingRsvps = await MeetingRsvp.find({ meetingId });
  const existingUserIds = existingRsvps.map((rsvp) => rsvp.userId.toString());

  const newRsvpsToCreate = userIds
    .filter((userId) => !existingUserIds.includes(userId.toString()))
    .map((userId) => ({
      meetingId,
      userId,
      status: "pending",
    }));

  if (newRsvpsToCreate.length > 0) {
    await MeetingRsvp.insertMany(newRsvpsToCreate);
  }

  return await MeetingRsvp.find({ meetingId }).populate(
    "userId",
    "name email profilePicture",
  );
};

/**
 * Updates a user's RSVP status for a meeting
 * @param {string} meetingId - The ID of the meeting
 * @param {string} userId - The user's ID
 * @param {Object} updateData - Status and optional declineReason/availabilityNote
 * @returns {Promise<Object>} Updated RSVP record
 */
export const updateRsvpStatus = async (meetingId, userId, updateData) => {
  const { status, declineReason, availabilityNote } = updateData;

  const validStatuses = ["pending", "accepted", "declined", "tentative"];
  if (status && !validStatuses.includes(status)) {
    throw new Error("Invalid RSVP status");
  }

  const updateFields = {};
  if (status) updateFields.status = status;
  if (declineReason !== undefined) updateFields.declineReason = declineReason;
  if (availabilityNote !== undefined)
    updateFields.availabilityNote = availabilityNote;

  const updatedRsvp = await MeetingRsvp.findOneAndUpdate(
    { meetingId, userId },
    { $set: updateFields },
    { new: true, upsert: true },
  ).populate("userId", "name email profilePicture");

  return updatedRsvp;
};

/**
 * Retrieves pending RSVPs for a given user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} List of pending RSVPs with populated meeting details
 */
export const getPendingRsvpsForUser = async (userId) => {
  return await MeetingRsvp.find({ userId, status: "pending" })
    .populate({
      path: "meetingId",
      select: "title date time location duration meetingType",
    })
    .sort({ createdAt: -1 });
};

/**
 * Retrieves an RSVP summary for a specific meeting
 * @param {string} meetingId - The ID of the meeting
 * @returns {Promise<Object>} Summary of RSVP statuses
 */
export const getMeetingRsvpSummary = async (meetingId) => {
  const rsvps = await MeetingRsvp.find({ meetingId }).populate(
    "userId",
    "name email profilePicture",
  );

  const summary = {
    total: rsvps.length,
    accepted: 0,
    declined: 0,
    tentative: 0,
    pending: 0,
    participants: rsvps,
  };

  rsvps.forEach((rsvp) => {
    summary[rsvp.status]++;
  });

  return summary;
};
