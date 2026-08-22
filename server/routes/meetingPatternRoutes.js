import express from "express";
import {
  getPatterns,
  acknowledgePattern,
  dismissPattern,
  triggerManualScan,
  createTaskFromPattern,
  configureAutomationFromPattern,
} from "../controllers/meetingPatternController.js";
import userAuth from "../middleware/userAuth.js";
import { requireAdminOrOwner } from "../middleware/rbac.js";

const router = express.Router();

router.use(userAuth);

router.get("/", getPatterns);
router.patch("/:id/acknowledge", acknowledgePattern);
router.patch("/:id/dismiss", dismissPattern);

// Pattern actionability (Task generation & Automation rule configuration)
router.post("/:id/create-task", createTaskFromPattern);
router.post("/:id/configure-automation", configureAutomationFromPattern);

// Admin only routes
router.post("/scan", requireAdminOrOwner, triggerManualScan);

export default router;
