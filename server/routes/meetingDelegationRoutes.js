import express from "express";
import {
  createDelegation,
  approveDelegation,
  rejectDelegation,
  revokeDelegation,
  getMyDelegations,
  getMeetingDelegation,
} from "../controllers/meetingDelegationController.js";
import authMiddleware from "../middleware/userAuth.js";

const router = express.Router();

// All delegation routes require authentication
router.use(authMiddleware);

// Create a delegation request
router.post("/", createDelegation);

// Get delegations for the logged-in user
router.get("/my-delegations", getMyDelegations);

// Get delegation status for a specific meeting
router.get("/meeting/:meetingId", getMeetingDelegation);

// Approve a delegation request
router.post("/:id/approve", approveDelegation);

// Reject a delegation request
router.post("/:id/reject", rejectDelegation);

// Revoke a delegation request
router.post("/:id/revoke", revokeDelegation);

export default router;
