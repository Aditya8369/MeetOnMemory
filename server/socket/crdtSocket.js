/**
 * crdtSocket.js
 * Provides foundational WebSocket infrastructure for Real-time Collaborative Agendas & Notes.
 * Integrates with Yjs/Automerge style CRDT updates (mocked/simplified).
 */

const { Server } = require("socket.io");

module.exports = function initializeCRDTSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/crdt-sync", // Distinct path for collaborative updates
  });

  io.on("connection", (socket) => {
    console.log(`[CRDT Socket] Client connected: ${socket.id}`);

    // Join a specific meeting document room
    socket.on("join-document", (documentId) => {
      socket.join(documentId);
      console.log(`[CRDT Socket] ${socket.id} joined document ${documentId}`);

      // Send the initial binary state (mocked)
      socket.emit("sync-step-1", new Uint8Array([0, 0]));
    });

    // Handle incoming binary CRDT updates
    socket.on("crdt-update", ({ documentId, update }) => {
      // Broadcast the delta to all other peers in the room
      socket.to(documentId).emit("crdt-update", update);

      // In a full implementation, the server would apply the update
      // to a centralized Y.Doc in memory and persist it periodically.
    });

    socket.on("disconnect", () => {
      console.log(`[CRDT Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
