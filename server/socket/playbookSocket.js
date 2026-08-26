export default (io, socket) => {
  // Join a specific meeting's playbook room
  socket.on("join_playbook_session", (meetingId) => {
    socket.join(`playbook_${meetingId}`);
    console.log(
      `Socket ${socket.id} joined playbook session for meeting ${meetingId}`,
    );
  });

  // Start the playbook
  socket.on("start_playbook", ({ meetingId, playbookId }) => {
    // We could store the current state in a database or Redis,
    // but for real-time signaling, we broadcast to the room.
    io.to(`playbook_${meetingId}`).emit("playbook_started", {
      playbookId,
      currentStepIndex: 0,
      startTime: Date.now(),
    });
  });

  // Advance to a specific step
  socket.on("advance_step", ({ meetingId, stepIndex }) => {
    io.to(`playbook_${meetingId}`).emit("step_changed", {
      currentStepIndex: stepIndex,
      startTime: Date.now(),
    });
  });

  // Emit a timer warning for the current step
  socket.on("timer_warning", ({ meetingId, stepIndex }) => {
    // This goes to the room. The frontend can decide if only the facilitator sees it or everyone.
    io.to(`playbook_${meetingId}`).emit("step_timer_warning", { stepIndex });
  });
};
