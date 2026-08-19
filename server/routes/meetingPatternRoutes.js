import express from "express";
import {
  getPatterns,
  acknowledgePattern,
  dismissPattern,
  triggerManualScan,
} from "../controllers/meetingPatternController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireOrganizationAdmin } from "../middleware/organizationMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getPatterns);
router.patch("/:id/acknowledge", acknowledgePattern);
router.patch("/:id/dismiss", dismissPattern);

// Admin only routes
router.post("/scan", requireOrganizationAdmin, triggerManualScan);

export default router;
