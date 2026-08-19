/**
 * Meeting access check for socket event handlers (Issues #1564 / #1385).
 *
 * Socket handlers receive the meeting/room id in the event payload, which is
 * entirely client-controlled — there is no router to hang `requireOrgAccess`
 * off, so the check has to happen inside the handler.
 *
 * Authorization is revalidated on every call against the current MongoDB user
 * and meeting documents. Never trust:
 * - client-supplied userId fields
 * - socket.rooms / prior join state
 * - stale socket.userOrganization from connection time alone
 *
 * Access rule (aligned with collaborativeDocAccess / requireOrgAccess):
 * - authenticated Clerk → MongoDB user
 * - meetings:view permission
 * - owner OR same organization OR listed participant
 */

import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import { hasPermission } from "./rbacPermissions.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

/**
 * @typedef {object} MeetingSocketAccessResult
 * @property {boolean} authorized
 * @property {string} [code]
 * @property {string} [message]
 * @property {object} [meeting]
 * @property {object} [user]
 */

/**
 * Resolve and authorize a client-supplied meeting/room id for a socket user.
 *
 * @param {string} meetingId
 * @param {object} socket - authenticated socket (middleware/socketAuth.js)
 * @returns {Promise<MeetingSocketAccessResult>}
 */
export const resolveMeetingSocketAccess = async (meetingId, socket) => {
  if (!socket?.userId) {
    return {
      authorized: false,
      code: "unauthenticated",
      message: "Unauthorized: Authentication required",
    };
  }

  if (!meetingId || !mongoose.isValidObjectId(String(meetingId))) {
    return {
      authorized: false,
      code: "invalid_meeting",
      message: "Invalid meeting ID",
    };
  }

  // Fresh user load so org/role removals take effect immediately (#1385).
  const user = await User.findById(socket.userId).select(
    "organization email name role",
  );

  if (!user) {
    return {
      authorized: false,
      code: "unauthenticated",
      message: "Unauthorized: User not found",
    };
  }

  const userRole = user.role || socket.userRole;
  if (!userRole || !hasPermission(userRole, "meetings", "view")) {
    return {
      authorized: false,
      code: "forbidden",
      message: "Forbidden: You don't have permission to view this meeting",
    };
  }

  const meeting = await Meeting.findById(meetingId).select(
    "organization uploadedBy participants",
  );

  if (!meeting) {
    return {
      authorized: false,
      code: "not_found",
      message: "Meeting not found",
    };
  }

  const authUser = {
    _id: user._id,
    organization: user.organization,
    email: user.email,
    name: user.name,
    role: userRole,
  };

  if (canAccessMeetingDoc(meeting, authUser)) {
    return { authorized: true, meeting, user: authUser };
  }

  const authenticatedUserId = authUser._id.toString();
  const authenticatedEmail = authUser.email?.toLowerCase?.() || "";

  const isParticipant = (meeting.participants || []).some((p) => {
    if (p.user && p.user.toString() === authenticatedUserId) return true;
    if (
      authenticatedEmail &&
      p.email &&
      p.email.toLowerCase() === authenticatedEmail
    ) {
      return true;
    }
    return false;
  });

  if (isParticipant) {
    return { authorized: true, meeting, user: authUser };
  }

  return {
    authorized: false,
    code: "forbidden",
    message: "Forbidden: You don't have access to this meeting",
  };
};

/**
 * Boolean wrapper kept for call sites that only need a yes/no answer.
 * Prefer `resolveMeetingSocketAccess` when the authorized meeting id is needed.
 */
export const verifyMeetingSocketAccess = async (meetingId, socket) => {
  const result = await resolveMeetingSocketAccess(meetingId, socket);
  return result.authorized;
};

export default {
  verifyMeetingSocketAccess,
  resolveMeetingSocketAccess,
};
