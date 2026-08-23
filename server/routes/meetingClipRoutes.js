import express from "express";
import {
  createClip,
  getClipsForMeeting,
  updateClip,
  deleteClip,
  addAnnotation,
} from "../controllers/meetingClipController.js";
import userAuth from "../middleware/userAuth.js";
import { requireOrgAccess, requirePermission } from "../middleware/rbac.js";
import Meeting from "../models/meetingModel.js";

const router = express.Router();

// All clip routes require authentication
router.use(userAuth);

// Base route is /api/clips
//
// GET names the meeting in the path, so requireOrgAccess can authorize it.
// POST / and /:clipId routes name the meeting in the body or via the clip
// document; those checks live in the controller (same pattern as
// transcript annotations) so a client-supplied org id is never trusted.
router.post("/", requirePermission("meetings", "edit"), createClip);
router.get(
  "/meeting/:meetingId",
  requireOrgAccess(Meeting),
  requirePermission("meetings", "view"),
  getClipsForMeeting,
);
router.put("/:clipId", requirePermission("meetings", "edit"), updateClip);
router.delete("/:clipId", requirePermission("meetings", "edit"), deleteClip);
router.post(
  "/:clipId/annotations",
  requirePermission("meetings", "edit"),
  addAnnotation,
);

export default router;
