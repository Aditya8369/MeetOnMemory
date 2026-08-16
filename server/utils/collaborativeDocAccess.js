/**
 * Authoritative meeting access check for collaborative document sockets
 * (Issue #1388). Always resolve meeting + current MongoDB user from the DB —
 * never trust prior join state, socket rooms, or client-supplied identity.
 */

import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

/**
 * @param {object} socket - Socket.IO socket with Clerk-authenticated userId/user
 * @param {string} meetingId - Client-supplied meeting id (validated server-side)
 * @returns {Promise<{ ok: true, meeting: object, user: object } | { ok: false, code: string, message: string }>}
 */
export const authorizeCollaborativeDocAccess = async (socket, meetingId) => {
  if (!socket?.userId) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Unauthorized: Authentication required",
    };
  }

  if (!meetingId || !mongoose.Types.ObjectId.isValid(String(meetingId))) {
    return {
      ok: false,
      code: "invalid_meeting",
      message: "Invalid meeting ID",
    };
  }

  const meeting = await Meeting.findById(meetingId).select(
    "organization uploadedBy participants",
  );

  if (!meeting) {
    return {
      ok: false,
      code: "not_found",
      message: "Meeting not found",
    };
  }

  // Re-load membership on every check so org/participant removals take effect.
  const user = await User.findById(socket.userId).select(
    "organization email name",
  );

  if (!user) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Unauthorized: User not found",
    };
  }

  const authUser = {
    _id: user._id,
    organization: user.organization,
    email: user.email,
    name: user.name,
  };

  if (canAccessMeetingDoc(meeting, authUser)) {
    return { ok: true, meeting, user: authUser };
  }

  // Preserve invitee access: listed participants may collaborate even when
  // canAccessMeetingDoc (owner/same-org) does not apply.
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
    return { ok: true, meeting, user: authUser };
  }

  return {
    ok: false,
    code: "forbidden",
    message:
      "Unauthorized: You do not have access to this meeting's collaborative notes",
  };
};

export default authorizeCollaborativeDocAccess;
