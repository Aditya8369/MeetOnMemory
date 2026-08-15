import express from "express";
import {
  detectDuplicates,
  mergeMeetings,
  dismissDuplicate,
} from "../controllers/meetingDuplicateController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireOrgMember } from "../middleware/rbacMiddleware.js";

const router = express.Router({ mergeParams: true });

// Require auth and organization membership for all duplicate operations
router.use(protect);
router.use(requireOrgMember);

// Base route is /api/meetings/:id/duplicates (handled in index.js)
router.route("/").get(detectDuplicates).post(dismissDuplicate); // For dismissing a duplicate pair via POST to /api/meetings/:id/duplicates

router.post("/merge", mergeMeetings);

export default router;
