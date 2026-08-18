import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  castVote,
  removeVote,
  getVoteTally,
  autoSortByVotes,
} from "../controllers/agendaVoteController.js";

const router = express.Router();

router.use(userAuth); // All voting routes require authentication

router.get("/:meetingId/agenda-votes", getVoteTally);
router.post("/:meetingId/agenda-votes/auto-sort", autoSortByVotes);
router.post("/:meetingId/agenda-votes/:agendaItemId", castVote);
router.delete("/:meetingId/agenda-votes/:agendaItemId", removeVote);

export default router;
