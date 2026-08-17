/**
 * Shared meeting access resolver (Issues #1389 / #1403).
 *
 * Loads a meeting by id and applies the same `canAccessMeetingDoc` rule used by
 * `requireOrgAccess` — owner or same organization. Never trust the client id
 * alone; never treat access to one meeting as access to another.
 */

import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

/**
 * @param {string} meetingId
 * @param {object} user - Authenticated MongoDB user (`req.user`)
 * @returns {Promise<{ meeting: object } | { error: { status: number, message: string } }>}
 */
export const resolveAccessibleMeeting = async (meetingId, user) => {
  if (!mongoose.isValidObjectId(meetingId)) {
    return {
      error: {
        status: 400,
        message: "Invalid meeting ID format",
      },
    };
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return {
      error: {
        status: 404,
        message: "Meeting not found",
      },
    };
  }

  if (!canAccessMeetingDoc(meeting, user)) {
    return {
      error: {
        status: 403,
        message: "Forbidden: You don't have access to this meeting",
      },
    };
  }

  return { meeting };
};

export default resolveAccessibleMeeting;
