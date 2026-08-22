import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getMyReports,
  getTeamReports,
  generateManualReport,
  getPreferences,
  updatePreferences,
} from "../controllers/standupReportController.js";

const router = express.Router();

router.use(userAuth);

router.get("/my", getMyReports);
router.get("/team", getTeamReports);
router.post("/generate", generateManualReport);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

export default router;
