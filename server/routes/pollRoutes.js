import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createPoll,
  getPollsByMeeting,
  castVote,
  closePoll,
  deletePoll,
} from "../controllers/pollController.js";

const router = express.Router();

router.use(protect); // All poll routes require authentication

router.post("/", createPoll);
router.get("/meeting/:meetingId", getPollsByMeeting);
router.post("/:id/vote", castVote);
router.patch("/:id/close", closePoll);
router.delete("/:id", deletePoll);

export default router;
