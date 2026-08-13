// server/socket/workspaceSocket.js
import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import { workspaceSyncService } from "../services/workspaceSyncService.js";
import authenticateSocket from "../middleware/socketAuth.js";

/**
 * Throttle utility to prevent cursor movement spam over WebSockets
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds to wait
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Authorize workspace access using the Clerk-authenticated MongoDB user only.
 * Never trust handshake.auth.userId / query.userId (Issue #1386).
 */
const authorizeWorkspaceAccess = async (socket, next) => {
  try {
    if (!socket.userId) {
      return next(new Error("Authentication error: User not found"));
    }

    const meetingId =
      socket.handshake.auth?.meetingId || socket.handshake.query?.meetingId;

    if (!meetingId) {
      return next(new Error("Meeting ID missing"));
    }

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return next(new Error("Invalid Meeting ID format"));
    }

    const meeting = await Meeting.findById(meetingId).select(
      "organization participants uploadedBy",
    );
    if (!meeting) {
      return next(new Error("Meeting not found"));
    }

    const authenticatedUserId = socket.userId.toString();
    const authenticatedEmail = socket.user?.email;

    const isParticipant = meeting.participants.some(
      (p) =>
        p.user?.toString() === authenticatedUserId ||
        (authenticatedEmail &&
          p.email &&
          p.email.toLowerCase() === authenticatedEmail.toLowerCase()),
    );
    const isOwner = meeting.uploadedBy?.toString() === authenticatedUserId;

    if (!isParticipant && !isOwner) {
      return next(
        new Error("Forbidden: You are not a participant of this meeting"),
      );
    }

    // Identity is already set by authenticateSocket — never overwrite from client.
    socket.meetingId = meetingId;
    socket.userName =
      socket.user?.name || socket.handshake.auth?.userName || "Anonymous";
    socket.userColor = socket.handshake.auth?.userColor || "#6366f1";

    next();
  } catch (error) {
    console.error("❌ Workspace Socket Auth Error:", error.message);
    next(new Error("Authentication failed"));
  }
};

/**
 * Initialize Workspace WebSocket events for the Collaborative War Room
 * @param {Object} io - Socket.IO server instance
 */
export const initWorkspaceSocket = (io) => {
  const workspaceNsp = io.of("/workspace");

  // Clerk JWT → MongoDB user (authoritative identity)
  workspaceNsp.use(authenticateSocket);
  // Meeting participant/owner check against authenticated user only
  workspaceNsp.use(authorizeWorkspaceAccess);

  workspaceNsp.on("connection", (socket) => {
    const room = `meeting-war-room-${socket.meetingId}`;
    console.log(
      `🟢 User ${socket.userName} connected to War Room: ${socket.meetingId}`,
    );

    // Join the specific meeting room
    socket.join(room);

    // Broadcast to others that a new user joined
    socket.to(room).emit("workspace:user-joined", {
      userId: socket.userId,
      userName: socket.userName,
      color: socket.userColor,
      joinedAt: new Date().toISOString(),
    });

    // --- CURSOR AWARENESS ---
    const broadcastCursor = throttle((data) => {
      socket.to(room).emit("workspace:cursor-move", {
        userId: socket.userId,
        userName: socket.userName,
        color: socket.userColor,
        x: data.x,
        y: data.y,
        canvasId: data.canvasId,
      });
    }, 30); // 30ms throttle for smooth 30fps cursor tracking

    socket.on("workspace:cursor-move", broadcastCursor);

    // --- CANVAS STATE SYNC ---
    socket.on("workspace:canvas-draw", async (data) => {
      // data: { type: 'node' | 'path', payload: {...} }
      socket.to(room).emit("workspace:canvas-draw", {
        userId: socket.userId,
        ...data,
      });

      // Persist to DB in background (fire and forget for low latency)
      workspaceSyncService
        .persistCanvasElement(socket.meetingId, data)
        .catch((err) => {
          console.error("❌ Failed to persist canvas element:", err.message);
        });
    });

    socket.on("workspace:canvas-clear", async () => {
      socket.to(room).emit("workspace:canvas-clear", { userId: socket.userId });
      await workspaceSyncService.clearCanvas(socket.meetingId);
    });

    // --- ACTION ITEM DRAG & DROP ---
    socket.on("workspace:action-move", async (data) => {
      // data: { actionId, fromColumn, toColumn, newIndex, item? }
      // Relay immediately (include client item when present) so remotes can
      // hydrate without a "Syncing..." placeholder (Issue #1213).
      socket.to(room).emit("workspace:action-move", {
        userId: socket.userId,
        actionId: data.actionId,
        fromColumn: data.fromColumn,
        toColumn: data.toColumn,
        newIndex: data.newIndex,
        item: data.item || null,
      });

      try {
        const { movedItem } = await workspaceSyncService.reorderActionItem(
          socket.meetingId,
          data.actionId,
          data.toColumn,
          data.newIndex,
        );

        // If the client omitted item (or sent a partial), push the persisted
        // document so remotes can replace any temporary placeholder.
        if (movedItem && !data.item) {
          socket.to(room).emit("workspace:action-move", {
            userId: socket.userId,
            actionId: data.actionId,
            fromColumn: data.fromColumn,
            toColumn: data.toColumn,
            newIndex: data.newIndex,
            item: movedItem,
          });
        }

        // Trigger AI Bottleneck Analysis asynchronously
        workspaceSyncService
          .analyzeBottlenecks(socket.meetingId, io, room)
          .catch((err) => {
            console.error("❌ AI Bottleneck analysis failed:", err.message);
          });
      } catch (error) {
        console.error("❌ Action move sync failed:", error.message);
        socket.emit("workspace:error", {
          message: "Failed to sync action item move",
        });
      }
    });

    // --- LIVE VOTING / REACTIONS ---
    socket.on("workspace:vote-topic", (data) => {
      // data: { topicId, voteType: 'up' | 'down' }
      socket.to(room).emit("workspace:vote-topic", {
        userId: socket.userId,
        ...data,
      });
    });

    // --- DISCONNECT HANDLING ---
    socket.on("disconnect", () => {
      console.log(`🔴 User ${socket.userName} disconnected from War Room`);
      socket.to(room).emit("workspace:user-left", {
        userId: socket.userId,
        userName: socket.userName,
      });
    });
  });
};

export { authorizeWorkspaceAccess };
