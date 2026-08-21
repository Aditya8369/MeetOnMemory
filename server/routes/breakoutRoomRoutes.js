import express from "express";
import {
  createRoom,
  getRooms,
  assignParticipants,
  startRoom,
  closeRoom,
} from "../controllers/breakoutRoomController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(userAuth);

// Routes for /api/meetings/:meetingId/breakout-rooms
router.post("/", createRoom);
router.get("/", getRooms);

// Routes for specific breakout room
router.put("/:roomId/participants", assignParticipants);
router.post("/:roomId/start", startRoom);
router.post("/:roomId/close", closeRoom);

export default router;
