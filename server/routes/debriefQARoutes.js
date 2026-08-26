import express from "express";
import { askQuestion, getSession } from "../controllers/debriefQAController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/session", askQuestion);
router.get("/session/:meetingId", getSession);

export default router;
