import express from "express";
import {
  generateHighlightReel,
  getHighlightReel,
  exportHighlightReelHtml,
} from "../controllers/highlightReelController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post(
  "/:meetingId/highlight-reel/generate",
  userAuth,
  generateHighlightReel,
);
router.get("/:meetingId/highlight-reel", userAuth, getHighlightReel);
router.get(
  "/:meetingId/highlight-reel/export",
  userAuth,
  exportHighlightReelHtml,
);

export default router;
