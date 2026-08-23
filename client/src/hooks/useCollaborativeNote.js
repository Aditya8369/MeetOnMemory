import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { io } from "socket.io-client";
import * as Y from "yjs";
import { toast } from "react-toastify";
import {
  createClerkSocketOptions,
  getClerkBearerToken,
} from "../services/apiClient.js";
import { getBackendUrl } from "../config/backendConfig.js";

/**
 * @desc Custom hook to manage the WebSocket connection, Yjs document state,
 * and awareness (presence) for a collaborative meeting note.
 *
 * @param {string} meetingId - The ID of the meeting to collaborate on.
 * @param {boolean} isReadOnly - If true, disables broadcasting of local changes.
 * @returns {Object} Yjs doc, awareness state, connection status, and snapshot functions.
 */
export const useCollaborativeNote = (meetingId, isReadOnly = false) => {
  const { userId, getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs to persist across renders without causing re-renders
  const socketRef = useRef(null);
  const ydocRef = useRef(new Y.Doc());
  const ytextRef = useRef(ydocRef.current.getText("collaborative-note"));
  const userColorRef = useRef("#000000");

  useEffect(() => {
    if (!meetingId || !isSignedIn) return;

    let isActive = true;

    const initializeSocket = async () => {
      const token = await getToken();

      if (!isActive) {
        setIsLoading(false);
        return;
      }

      // Initialize Socket.io connection using shared Clerk options & backend URL config
      const opts = await createClerkSocketOptions({
        transports: ["websocket", "polling"],
      });
      if (!isActive) return;

      if (token && (!opts.auth || !opts.auth.token)) {
        opts.auth = { token };
      }

      const backendUrl = getBackendUrl();
      const socket = io(`${backendUrl}/notes`, opts);
      socketRef.current = socket;

      socket.on("connect_error", (err) => {
        console.error("[CollabNote] Socket connection error:", err);
        const errorMsg =
          err?.message || "Failed to connect to collaborative notes server";
        setError(errorMsg);
        setIsConnected(false);
        setIsLoading(false);
        toast.error(`Collaborative notes connection error: ${errorMsg}`);
      });

      socket.on("reconnect_attempt", async () => {
        try {
          const freshToken =
            (await getClerkBearerToken()) || (await getToken());
          if (socket.auth) {
            socket.auth.token = freshToken;
          } else {
            socket.auth = { token: freshToken };
          }
        } catch (err) {
          console.warn(
            "[CollabNote] Failed to refresh token for reconnect",
            err,
          );
        }
      });

      socket.on("connect", () => {
        console.log("[CollabNote] Socket connected");
        setIsConnected(true);
        setError(null);

        // Join the meeting room and fetch initial state
        socket.emit("join-meeting", { meetingId }, async (response) => {
          if (!isActive) return;
          if (response?.success) {
            userColorRef.current = response.userColor;
            setActiveUsers(response.activeUsers || []);
          } else {
            const errorMsg = response?.error || "Failed to join meeting";
            setError(errorMsg);
            toast.error(errorMsg);
          }
          setIsLoading(false);
        });
      });

      socket.on("disconnect", () => {
        console.log("[CollabNote] Socket disconnected");
        setIsConnected(false);
      });

      // Listen for remote CRDT updates from other clients
      socket.on("remote-update", ({ update, userId: remoteUserId }) => {
        if (remoteUserId !== userId) {
          const uint8Update = new Uint8Array(update);
          Y.applyUpdate(ydocRef.current, uint8Update);
        }
      });

      // Listen for awareness (cursor/presence) updates
      socket.on(
        "remote-awareness",
        ({ userId: remoteUserId, userName, cursor }) => {
          setActiveUsers((prev) => {
            const existing = prev.find((u) => u.userId === remoteUserId);
            if (existing) {
              return prev.map((u) =>
                u.userId === remoteUserId
                  ? { ...u, cursorPosition: cursor, lastSeen: new Date() }
                  : u,
              );
            }
            return [
              ...prev,
              {
                userId: remoteUserId,
                userName,
                cursorPosition: cursor,
                lastSeen: new Date(),
              },
            ];
          });
        },
      );

      socket.on("user-joined", ({ userId: remoteUserId, userName, color }) => {
        setActiveUsers((prev) => {
          if (prev.some((u) => u.userId === remoteUserId)) return prev;
          return [
            ...prev,
            {
              userId: remoteUserId,
              userName,
              userColor: color,
              lastSeen: new Date(),
            },
          ];
        });
      });

      socket.on("user-left", ({ userId: remoteUserId }) => {
        setActiveUsers((prev) => prev.filter((u) => u.userId !== remoteUserId));
      });

      socket.on("snapshot-created", (snapshot) => {
        console.log("[CollabNote] New snapshot created:", snapshot);
      });

      // Observe local Yjs document changes to broadcast to server
      const updateHandler = (update, origin) => {
        if (origin !== "remote" && !isReadOnly) {
          socket.emit("sync-update", {
            meetingId,
            update: Array.from(update),
          });
        }
      };

      const ydoc = ydocRef.current;
      ydoc.on("update", updateHandler);

      return () => {
        ydoc.off("update", updateHandler);
        socket.disconnect();
      };
    };

    const cleanupSocket = initializeSocket();

    return () => {
      isActive = false;
      const activeSocket = socketRef.current;
      if (activeSocket) {
        activeSocket.disconnect();
      }
      if (cleanupSocket && typeof cleanupSocket.then === "function") {
        cleanupSocket.then((cleanup) => cleanup && cleanup());
      }
    };
  }, [meetingId, getToken, isReadOnly, isSignedIn, userId]);

  /**
   * @desc Broadcasts local cursor position to other clients.
   * Should be called by the editor component on selection change.
   */
  const broadcastCursor = useCallback(
    (anchor, head) => {
      if (socketRef.current && isConnected && !isReadOnly) {
        socketRef.current.emit("awareness-update", {
          meetingId,
          cursor: { anchor, head },
        });
      }
    },
    [meetingId, isConnected, isReadOnly],
  );

  /**
   * @desc Triggers a manual snapshot save.
   */
  const saveSnapshot = useCallback(
    async (title) => {
      if (!socketRef.current || !isConnected) return;

      return new Promise((resolve) => {
        socketRef.current.emit(
          "save-snapshot",
          { meetingId, title },
          (response) => {
            resolve(response);
          },
        );
      });
    },
    [meetingId, isConnected],
  );

  return {
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
    isConnected,
    isLoading,
    error,
    activeUsers,
    userColor: userColorRef.current,
    broadcastCursor,
    saveSnapshot,
  };
};
