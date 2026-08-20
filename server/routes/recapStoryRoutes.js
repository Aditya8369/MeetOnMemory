// server/routes/recapStoryRoutes.js
import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getRecapStory } from "../controllers/recapStoryController.js";

const router = express.Router();

/**
 * GET /api/recap-story/:meetingId
 * Requires basic user authentication and enforces organization tenant validation in the controller.
 */
router.get("/:meetingId", userAuth, getRecapStory);
router.get("/", userAuth, getRecapStory);

export default router;
