import { z } from "zod";
import { breakoutRoomService } from "../services/breakoutRoomService.js";

// Zod schemas for validation
const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").trim(),
});

const assignParticipantsSchema = z.object({
  participantIds: z.array(z.string().min(1)),
});

export const createRoom = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const validatedData = createRoomSchema.parse(req.body);
    const room = await breakoutRoomService.createRoom(
      meetingId,
      validatedData.name,
    );
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    next(error);
  }
};

export const getRooms = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const rooms = await breakoutRoomService.getRoomsForMeeting(meetingId);
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

export const assignParticipants = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const validatedData = assignParticipantsSchema.parse(req.body);
    const room = await breakoutRoomService.assignParticipants(
      roomId,
      validatedData.participantIds,
    );
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    next(error);
  }
};

export const startRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await breakoutRoomService.startRoom(roomId);
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

export const closeRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await breakoutRoomService.closeRoom(roomId);
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};
