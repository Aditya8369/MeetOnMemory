import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { authorizeMeetingAccess } from "../middleware/meetingAccessMiddleware.js";
import {
  getChapters,
  generateChapters,
  addChapter,
  updateChapter,
  deleteChapter,
} from "../controllers/transcriptChapterController.js";

const router = express.Router({ mergeParams: true });

// All routes are scoped under /api/meetings/:meetingId/chapters
// We expect the main router to apply the auth and meeting access middleware,
// but we can also add them here if needed.

router.use(requireAuth);
router.use(authorizeMeetingAccess);

router.get("/", getChapters);
router.post("/generate", generateChapters);
router.post("/", addChapter);
router.put("/:chapterId", updateChapter);
router.delete("/:chapterId", deleteChapter);

export default router;
