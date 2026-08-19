// server/socket/workspaceSocket.js
import { workspaceSyncService } from "../services/workspaceSyncService.js";
import authenticateSocket from "../middleware/socketAuth.js";
import { authorizeCollaborativeDocAccess } from "../utils/collaborativeDocAccess.js";

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
 * Authorize workspace access using Clerk-authenticated identity only.
 * Reuses collaborative meeting access (owner / same-org / participant).
 * Never trust handshake.auth.userId / query.userId / payload.userId (#1386 / #1399).
 */
export const authorizeWorkspaceAccess = async (socket, next) => {
  try {
    if (!socket.userId) {
      return next(new Error("Authentication error: User not found"));
    }

    const meetingId =
      socket.handshake.auth?.meetingId || socket.handshake.query?.meetingId;

    if (!meetingId) {
      return next(new Error("Meeting ID missing"));
    }

    const access = await authorizeCollaborativeDocAccess(socket, meetingId);
    if (!access.ok) {
      const message =
        access.code === "not_found"
          ? "Meeting not found"
          : access.code === "invalid_meeting"
            ? "Invalid Meeting ID format"
            : access.message ||
              "Forbidden: You are not authorized for this workspace";
      return next(new Error(message));
    }

    // Identity is already set by authenticateSocket — never overwrite from client.
    socket.meetingId = String(access.meeting._id || meetingId);
    socket.userName = access.user?.name || socket.user?.name || "Anonymous";
    // Display-only cosmetic; never used for authorization.
    socket.userColor = socket.handshake.auth?.userColor || "#6366f1";

    next();
  } catch (error) {
    console.error("❌ Workspace Socket Auth Error:", error.message);
    next(new Error("Authentication failed"));
  }
};

/**
 * Re-validate meeting access for a connected socket before handling events.
 * Join-time auth alone is insufficient after org/participant removals (#1399).
 */
export const ensureWorkspaceEventAccess = async (socket) => {
  if (!socket?.userId || !socket?.meetingId) {
    return {
      ok: false,
      message: "Unauthorized: Authentication required",
    };
  }

  const access = await authorizeCollaborativeDocAccess(
    socket,
    socket.meetingId,
  );
  if (!access.ok) {
    return {
      ok: false,
      message:
        access.message ||
        "Forbidden: You are not authorized for this workspace",
    };
  }

  return { ok: true, access };
};

let isInitialized = false;
/** @type {import("socket.io").Namespace | null} */
let workspaceNsp = null;

/**
 * Initialize Workspace WebSocket events for the Collaborative War Room.
 * Idempotent — safe under hot reload / repeated configureSocket calls (#1399).
 *
 * @param {Object} io - Socket.IO server instance
 */
export const initWorkspaceSocket = (io) => {
  if (isInitialized) {
    console.warn("⚠️ Workspace socket namespace already initialized");
    return workspaceNsp;
  }

  workspaceNsp = io.of("/workspace");

  // Clerk JWT → MongoDB user (authoritative identity)
  workspaceNsp.use(authenticateSocket);
  // Meeting owner / same-org / participant check against authenticated user only
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
    const broadcastCursor = throttle(async (data) => {
      const gate = await ensureWorkspaceEventAccess(socket);
      if (!gate.ok) return;

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
      const gate = await ensureWorkspaceEventAccess(socket);
      if (!gate.ok) {
        socket.emit("workspace:error", { message: gate.message });
        return;
      }

      // data: { type: 'node' | 'path', payload: {...} }
      // Ignore any client-supplied userId — always use Clerk-resolved identity.
      socket.to(room).emit("workspace:canvas-draw", {
        ...data,
        userId: socket.userId,
      });

      // Persist to DB in background (fire and forget for low latency)
      workspaceSyncService
        .persistCanvasElement(socket.meetingId, data)
        .catch((err) => {
          console.error("❌ Failed to persist canvas element:", err.message);
        });
    });

    socket.on("workspace:canvas-clear", async () => {
      const gate = await ensureWorkspaceEventAccess(socket);
      if (!gate.ok) {
        socket.emit("workspace:error", { message: gate.message });
        return;
      }

      socket.to(room).emit("workspace:canvas-clear", { userId: socket.userId });
      await workspaceSyncService.clearCanvas(socket.meetingId);
    });

    // --- ACTION ITEM DRAG & DROP ---
    socket.on("workspace:action-move", async (data) => {
      const gate = await ensureWorkspaceEventAccess(socket);
      if (!gate.ok) {
        socket.emit("workspace:error", { message: gate.message });
        return;
      }

      // data: { actionId, fromColumn, toColumn, newIndex, item? }
      // Relay immediately (include client item when present) so remotes can
      // hydrate without a "Syncing..." placeholder (Issue #1213).
      socket.to(room).emit("workspace:action-move", {
        userId: socket.userId,
        actionId: data?.actionId,
        fromColumn: data?.fromColumn,
        toColumn: data?.toColumn,
        newIndex: data?.newIndex,
        item: data?.item || null,
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
    socket.on("workspace:vote-topic", async (data) => {
      const gate = await ensureWorkspaceEventAccess(socket);
      if (!gate.ok) {
        socket.emit("workspace:error", { message: gate.message });
        return;
      }

      // data: { topicId, voteType: 'up' | 'down' }
      socket.to(room).emit("workspace:vote-topic", {
        userId: socket.userId,
        topicId: data?.topicId,
        voteType: data?.voteType,
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

  isInitialized = true;
  console.log("✅ Workspace /workspace namespace registered");
  return workspaceNsp;
};

/**
 * Test helper — clears the once-only registration guard.
 * Production shutdown relies on Socket.IO `io.close()` for namespace teardown.
 */
export const resetWorkspaceSocketRegistration = () => {
  isInitialized = false;
  workspaceNsp = null;
};

export const isWorkspaceSocketInitialized = () => isInitialized;
