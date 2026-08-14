import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  sendRsvpRequests,
  respondToRsvp,
  getPendingRsvps,
  getMeetingSummary,
} from "../controllers/meetingRsvpController.js";

const router = express.Router();

// Require authentication for all RSVP routes
router.use(requireAuth);

// Get pending RSVPs for the logged-in user
router.get("/pending", getPendingRsvps);

// Get the RSVP summary for a specific meeting
router.get("/meeting/:meetingId", getMeetingSummary);

// Send RSVP requests to participants
router.post("/send/:meetingId", sendRsvpRequests);

// Respond to an RSVP request
router.put("/:meetingId/respond", respondToRsvp);

export default router;
