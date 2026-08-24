import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  generateBriefing,
  getBriefing,
} from "../controllers/preMeetingBriefingController.js";

const router = express.Router();

router.use(userAuth);

router.post("/:meetingId/generate", generateBriefing);
router.get("/:meetingId", getBriefing);

export default router;
