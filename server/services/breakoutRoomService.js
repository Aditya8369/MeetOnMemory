import BreakoutRoom from "../models/breakoutRoomModel.js";
import Meeting from "../models/meetingModel.js";
import { generateText } from "./GenerativeAIService.js";

export const breakoutRoomService = {
  createRoom: async (meetingId, name) => {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    const newRoom = new BreakoutRoom({
      meetingId,
      name,
      participants: [],
      status: "pending",
    });

    return await newRoom.save();
  },

  assignParticipants: async (roomId, participantIds) => {
    const room = await BreakoutRoom.findById(roomId);
    if (!room) {
      throw new Error("Breakout room not found");
    }

    room.participants = participantIds;
    return await room.save();
  },

  startRoom: async (roomId) => {
    const room = await BreakoutRoom.findById(roomId);
    if (!room) {
      throw new Error("Breakout room not found");
    }

    room.status = "active";
    room.startTime = new Date();
    return await room.save();
  },

  closeRoom: async (roomId) => {
    const room = await BreakoutRoom.findById(roomId);
    if (!room) {
      throw new Error("Breakout room not found");
    }

    room.status = "closed";
    room.closeTime = new Date();

    // Summarize the transcript using AI if there is one
    if (room.transcript && room.transcript.length > 0) {
      try {
        const transcriptText = room.transcript
          .map((t) => `${t.speakerName}: ${t.text}`)
          .join("\n");

        const prompt = `Please summarize the following discussion from a breakout room named "${room.name}":\n\n${transcriptText}\n\nSummary:`;
        const summary = await generateText(
          prompt,
          `Breakout room ${room.name} summary`,
        );
        room.summary = summary.trim();
      } catch (err) {
        console.error(
          `Failed to generate summary for breakout room ${roomId}`,
          err,
        );
        room.summary = "Summary generation failed.";
      }
    }

    await room.save();

    // Merge into main meeting aiNotes (using a basic append approach)
    // Note: Depends on how MeetingModel handles aiNotes.
    // Assuming meeting has a notes field or similar. Let's append to description or a new field if aiNotes doesn't exist.
    const meeting = await Meeting.findById(room.meetingId);
    if (meeting) {
      const roomNote = `\n\n--- Breakout Room: ${room.name} Summary ---\n${room.summary || "No summary available."}\n`;
      meeting.description = (meeting.description || "") + roomNote;
      await meeting.save();
    }

    return room;
  },

  getRoomsForMeeting: async (meetingId) => {
    return await BreakoutRoom.find({ meetingId }).populate(
      "participants",
      "name email",
    );
  },

  addTranscriptEvent: async (roomId, speakerId, speakerName, text) => {
    const room = await BreakoutRoom.findById(roomId);
    if (!room) {
      throw new Error("Breakout room not found");
    }
    room.transcript.push({
      speakerId,
      speakerName,
      text,
      timestamp: new Date(),
    });
    return await room.save();
  },
};
