import express from "express";
import {
  getWatchlist,
  updateWatchlist,
  toggleAlerts,
} from "../controllers/keywordAlertController.js";
import protect from "../middleware/userAuth.js";
import { requireOrgMembership } from "../middleware/rbac.js";

const router = express.Router();

router.use(protect, requireOrgMembership);

router.route("/").get(getWatchlist).put(updateWatchlist);

router.patch("/toggle", toggleAlerts);

export default router;
