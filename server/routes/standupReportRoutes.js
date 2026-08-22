import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getMyReports,
  getTeamReports,
  generateManualReport,
  getPreferences,
  updatePreferences,
} from "../controllers/standupReportController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/my", getMyReports);
router.get("/team", getTeamReports);
router.post("/generate", generateManualReport);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

export default router;
