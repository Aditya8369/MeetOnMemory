import express from "express";
import {
  detectDuplicates,
  mergeMeetings,
  dismissDuplicate,
  rollbackMerge,
} from "../controllers/meetingDuplicateController.js";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership } from "../middleware/rbac.js";

const router = express.Router({ mergeParams: true });

router.use(userAuth);
router.use(requireOrgMembership);

// Base route is /api/meetings/:id/duplicates
router.route("/").get(detectDuplicates).post(dismissDuplicate);
router.post("/merge", mergeMeetings);
router.post("/rollback/:mergeAuditId", rollbackMerge);

export default router;
