import mongoose from "mongoose";
import { translateSegment } from "../services/realtimeTranslationService.js";
import Meeting from "../models/meetingModel.js";
import RealtimeTranslationCache from "../models/TranslationCache.js";
import { hasPermission } from "../utils/rbacPermissions.js";

/**
 * Helper to verify user access to a specific meeting room.
 *
 * @param {string} meetingId - Meeting ID to verify
 * @param {Object} socket - Socket instance
 * @returns {Promise<boolean>} True if authorized
 */
const verifyMeetingAccess = async (meetingId, socket) => {
  if (!meetingId || !mongoose.isValidObjectId(meetingId)) {
    return false;
  }
  if (!socket.userId || !socket.userRole) {
    return false;
  }
  if (!hasPermission(socket.userRole, "meetings", "view")) {
    return false;
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return false;
  }

  const isOwner = meeting.uploadedBy?.toString() === socket.userId.toString();
  const isInSameOrg =
    meeting.organization &&
    socket.userOrganization &&
    meeting.organization.toString() === socket.userOrganization.toString();

  return isOwner || isInSameOrg;
};

/**
 * Translation Socket Handler
 * Handles real-time translation events via Socket.IO
 */
export default (io) => {
  io.on("connection", (socket) => {
    // Unauthenticated connections are disconnected
    if (!socket.userId) {
      console.warn(
        "🌐 Translation socket rejected: Unauthenticated connection",
      );
      socket.disconnect(true);
      return;
    }

    console.log("🌐 Translation socket connected:", socket.id);

    // Join translation room for a meeting
    socket.on("translation:join", async (data) => {
      try {
        const { meetingId } = data;
        const authorized = await verifyMeetingAccess(meetingId, socket);

        if (!authorized) {
          socket.emit("translation:error", {
            message: "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        socket.join(meetingId);
        socket.emit("translation:joined", { meetingId });
        console.log(`✓ User ${socket.userId} joined translation: ${meetingId}`);
      } catch (error) {
        console.error("Error joining translation room:", error);
        socket.emit("translation:error", {
          message: "Failed to join translation room",
        });
      }
    });

    // Handle translation request
    socket.on("translation:request", async (data) => {
      try {
        const {
          meetingId,
          segmentId,
          sourceText,
          sourceLanguage,
          targetLanguage,
          context,
        } = data;

        const authorized = await verifyMeetingAccess(meetingId, socket);
        if (!authorized) {
          socket.emit("translation:error", {
            segmentId,
            error: "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        console.log(
          `📝 Translation request: ${sourceLanguage} -> ${targetLanguage}`,
        );

        const translation = await translateSegment(
          meetingId,
          segmentId,
          sourceText,
          sourceLanguage,
          targetLanguage,
          context,
        );

        // Emit translation result to all participants in the meeting
        io.to(meetingId).emit("translation:result", {
          segmentId,
          sourceLanguage,
          targetLanguage,
          ...translation,
        });

        console.log(`✓ Translation completed for ${targetLanguage}`);
      } catch (error) {
        console.error("Translation socket error:", error);
        socket.emit("translation:error", {
          segmentId: data.segmentId,
          error: error.message,
        });
      }
    });

    // Handle language change
    socket.on("translation:language-change", async (data) => {
      try {
        const { meetingId, language } = data;
        const authorized = await verifyMeetingAccess(meetingId, socket);

        if (!authorized) {
          return;
        }

        console.log(`🔄 User ${socket.userId} changed language to ${language}`);

        // Broadcast language change to all participants
        io.to(meetingId).emit("translation:language-change", {
          userId: socket.userId,
          language,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Language change error:", error);
      }
    });

    // Handle manual correction
    socket.on("translation:correction", async (data) => {
      try {
        const { meetingId, segmentId, language, correctedText } = data;

        const authorized = await verifyMeetingAccess(meetingId, socket);
        if (!authorized) {
          socket.emit("translation:error", {
            segmentId,
            error: "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        console.log(`✏️ Manual correction submitted by ${socket.userId}`);

        // Import correction function dynamically to avoid circular dependency
        const { submitCorrection } =
          await import("../services/realtimeTranslationService.js");

        await submitCorrection(
          meetingId,
          segmentId,
          language,
          correctedText,
          socket.userId,
        );

        // Broadcast correction to all participants
        io.to(meetingId).emit("translation:correction", {
          segmentId,
          language,
          correctedText,
          userId: socket.userId,
          timestamp: Date.now(),
        });

        console.log(`✓ Correction broadcasted`);
      } catch (error) {
        console.error("Correction socket error:", error);
        socket.emit("translation:error", {
          segmentId: data.segmentId,
          error: error.message,
        });
      }
    });

    // Handle quality update request
    socket.on("translation:quality-request", async (data) => {
      try {
        const { segmentId } = data;

        // Fetch segment cache to verify meeting ID access
        const cache = await RealtimeTranslationCache.findOne({ segmentId });
        if (!cache) {
          socket.emit("translation:error", {
            segmentId,
            error: "Segment not found",
          });
          return;
        }

        const authorized = await verifyMeetingAccess(
          cache.meeting.toString(),
          socket,
        );
        if (!authorized) {
          socket.emit("translation:error", {
            segmentId,
            error: "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        const { getQualityMetrics } =
          await import("../services/realtimeTranslationService.js");
        const metrics = await getQualityMetrics(segmentId);

        socket.emit("translation:quality-update", {
          segmentId,
          metrics,
        });
      } catch (error) {
        console.error("Quality update error:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("🌐 Translation socket disconnected:", socket.id);
    });
  });
};
