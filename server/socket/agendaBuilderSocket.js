// agendaBuilderSocket.js

export default function agendaBuilderSocket(io) {
  io.on("connection", (socket) => {
    // Usually participants join a meeting room string, e.g. "meeting:123"
    // handled by meetingSocket.js or here. We assume they are already in the room.

    // Additional real-time interactions for agenda builder if the client emits events.
    // However, currently our controller emits the events (e.g. "agenda:proposal:new").
    // We only need this if the client explicitly sends Socket.IO messages rather than REST.
    // For now, we'll listen for any client-side specific requests.

    socket.on("agenda:proposal:typing", ({ meetingId, userId }) => {
      socket
        .to(`meeting:${meetingId}`)
        .emit("agenda:proposal:typing", { userId });
    });
  });
}
