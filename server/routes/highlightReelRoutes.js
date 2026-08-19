import express from "express";
import {
  generateHighlightReel,
  getHighlightReel,
  exportHighlightReelHtml,
} from "../controllers/highlightReelController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/:meetingId/highlight-reel/generate",
  requireAuth,
  generateHighlightReel,
);
router.get("/:meetingId/highlight-reel", requireAuth, getHighlightReel);
router.get(
  "/:meetingId/highlight-reel/export",
  requireAuth,
  exportHighlightReelHtml,
);

export default router;
