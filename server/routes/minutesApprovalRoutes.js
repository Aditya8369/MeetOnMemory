import express from "express";
import {
  getApprovalStatus,
  submitApproval,
  respondApproval,
} from "../controllers/minutesApprovalController.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

const router = express.Router({ mergeParams: true }); // mergeParams needed because meetingId is in the prefix

// /api/meetings/:meetingId/minutes-approval
router.get("/", ClerkExpressRequireAuth(), getApprovalStatus);
router.post("/submit", ClerkExpressRequireAuth(), submitApproval);
router.put("/respond", ClerkExpressRequireAuth(), respondApproval);

export default router;
