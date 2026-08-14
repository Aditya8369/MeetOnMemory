import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import { hasPermission } from "./rbacPermissions.js";

/**
 * Meeting access check for socket event handlers (Issue #1564).
 *
 * Socket handlers receive the meeting/room id in the event payload, which is
 * entirely client-controlled — there is no router to hang `requireOrgAccess`
 * off, so the check has to happen inside the handler. `socket/reactionSocket.js`
 * had no check at all and would broadcast into, and write a Reaction document
 * against, any meeting id a signed-in client cared to send.
 *
 * The rule matches the one already enforced over HTTP by
 * `requireOrgAccess(Meeting)` in `routes/meetingRoutes.js`, and the one
 * `socket/translationSocket.js` implements inline: the caller must be
 * authenticated, hold the `meetings:view` permission for their role, and either
 * own the meeting or belong to its organization.
 *
 * @param {string} meetingId  id from the event payload — never trusted
 * @param {object} socket     an authenticated socket (see middleware/socketAuth.js)
 * @returns {Promise<boolean>} true when the caller may act on the meeting
 */
export const verifyMeetingSocketAccess = async (meetingId, socket) => {
  if (!meetingId || !mongoose.isValidObjectId(meetingId)) {
    return false;
  }

  if (!socket?.userId || !socket?.userRole) {
    return false;
  }

  if (!hasPermission(socket.userRole, "meetings", "view")) {
    return false;
  }

  const meeting = await Meeting.findById(meetingId).select(
    "organization uploadedBy",
  );
  if (!meeting) {
    return false;
  }

  const isOwner = meeting.uploadedBy?.toString() === socket.userId.toString();
  const isInSameOrg =
    meeting.organization &&
    socket.userOrganization &&
    meeting.organization.toString() === socket.userOrganization.toString();

  return Boolean(isOwner || isInSameOrg);
};

export default { verifyMeetingSocketAccess };
