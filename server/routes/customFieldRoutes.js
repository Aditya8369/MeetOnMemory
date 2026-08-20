import express from "express";
import {
  createDefinition,
  getDefinitions,
  setMeetingFields,
  getMeetingFields,
} from "../controllers/customFieldController.js";
import requireAuth from "../middleware/userAuth.js";
// Assume role checks for admin exist, otherwise just use requireAuth
import { requireRole } from "../middleware/roleAuth.js";

const router = express.Router();

router.use(requireAuth);

// Organization level definitions
// Example path: /api/custom-fields/org/:orgId
router.post("/org/:orgId", requireRole(["admin", "owner"]), createDefinition);
router.get("/org/:orgId", getDefinitions);

// Meeting level values
// Example path: /api/custom-fields/meeting/:meetingId
router.post("/meeting/:meetingId", setMeetingFields);
router.get("/meeting/:meetingId", getMeetingFields);

export default router;
