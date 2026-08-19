import express from "express";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";
import {
  getConfig,
  updateConfig,
  getPreview,
  applyCarryForward,
} from "../controllers/carryForwardController.js";

const router = express.Router();

router.use(userAuth);
router.use(requireOrgMembership);

router.get(
  "/:seriesId/carry-forward/config",
  requirePermission("meetings", "view"),
  getConfig,
);

router.put(
  "/:seriesId/carry-forward/config",
  requirePermission("meetings", "edit"),
  updateConfig,
);

router.get(
  "/:seriesId/carry-forward/preview",
  requirePermission("meetings", "view"),
  getPreview,
);

router.post(
  "/:seriesId/carry-forward/apply",
  requirePermission("meetings", "edit"),
  applyCarryForward,
);

export default router;
