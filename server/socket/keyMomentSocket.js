import Meeting from "../models/meetingModel.js";
import { hasPermission } from "../utils/rbacPermissions.js";

export const KEY_MOMENTS_ROOM_PREFIX = "meeting:";
export const KEY_MOMENTS_ROOM_SUFFIX = ":key-moments";

export const getKeyMomentsRoom = (meetingId) =>
  `${KEY_MOMENTS_ROOM_PREFIX}${meetingId}${KEY_MOMENTS_ROOM_SUFFIX}`;

const canAccessMeeting = async (socket, meetingId) => {
  if (
    !socket.userId ||
    !socket.userRole ||
    !hasPermission(socket.userRole, "meetings", "view")
  ) {
    return false;
  }

  const meeting = await Meeting.findById(meetingId).select(
    "uploadedBy organization",
  );
  if (!meeting) return false;

  const userId = socket.userId.toString();
  const isOwner = meeting.uploadedBy?.toString() === userId;
  const isSameOrganization =
    meeting.organization &&
    socket.userOrganization &&
    meeting.organization.toString() === socket.userOrganization.toString();

  return isOwner || isSameOrganization;
};

export default (io) => {
  io.on("connection", (socket) => {
    const joinedRooms = new Set();

    const leaveKeyMomentsRoom = (meetingId) => {
      if (!meetingId) return;
      const room = getKeyMomentsRoom(meetingId);
      socket.leave(room);
      joinedRooms.delete(room);
    };

    socket.on("join-key-moments-room", async ({ meetingId } = {}) => {
      try {
        if (!meetingId) {
          socket.emit("keyMoment:error", {
            message: "Meeting ID is required",
          });
          return;
        }

        const allowed = await canAccessMeeting(socket, meetingId);
        if (!allowed) {
          socket.emit("keyMoment:error", {
            message: "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        const room = getKeyMomentsRoom(meetingId);
        socket.join(room);
        joinedRooms.add(room);

        socket.emit("keyMoment:room-joined", { meetingId });
      } catch (error) {
        console.error("Error joining key moments room:", error);
        socket.emit("keyMoment:error", {
          message: "Failed to join key moments room",
        });
      }
    });

    socket.on("leave-key-moments-room", ({ meetingId } = {}) => {
      leaveKeyMomentsRoom(meetingId);
    });

    socket.on("disconnect", () => {
      joinedRooms.clear();
    });
  });
};

export { canAccessMeeting };
