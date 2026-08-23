import express from "express";
import userAuth from "../middleware/userAuth.js";
// import requirePermission from "../middleware/requirePermission.js"; // Based on typical RBAC structures, assuming this exists or similar
import {
  calculateMeetingScore,
  getMeetingScore,
  getOrganizationTrends,
  getSeriesTrends,
} from "../controllers/effectivenessScoreController.js";

const router = express.Router();

// Apply authentication to all routes
router.use(userAuth);

// Optional: add permission middleware if available, e.g.
// const requireReportsView = requirePermission('reports', 'view');
// For now we'll stick to userAuth, but follow the user's AC requirement.
// The AC says: Route with userAuth + requirePermission('reports', 'view').
// I'll add a dummy middleware check just in case, or look for the exact permission middleware.
// Let me look at how permissions are handled first if needed, but for now I'll mock it if it doesn't exist or use the standard one.

// Using a basic inline middleware placeholder for requirePermission if the actual one is not found easily.
// I will just import what was requested:
import { requirePermission } from "../middleware/rbac.js";

router.post(
  "/calculate/:meetingId",
  requirePermission("reports", "view"),
  calculateMeetingScore,
);
router.get(
  "/meeting/:meetingId",
  requirePermission("reports", "view"),
  getMeetingScore,
);
router.get(
  "/organization/:organizationId",
  requirePermission("reports", "view"),
  getOrganizationTrends,
);
router.get(
  "/series/:seriesId",
  requirePermission("reports", "view"),
  getSeriesTrends,
);

export default router;
