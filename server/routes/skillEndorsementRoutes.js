import express from "express";
import {
  createEndorsement,
  getMeetingEndorsements,
  getUserEndorsements,
} from "../controllers/skillEndorsementController.js";
 feature/careers-admin-queue-2262
import requireAuth from "../middleware/userAuth.js";

import userAuth from "../middleware/userAuth.js";
 main

const router = express.Router();

// All routes require authentication
router.use(userAuth);

router.post("/", createEndorsement);
router.get("/meeting/:meetingId", getMeetingEndorsements);
router.get("/user/:userId", getUserEndorsements);

export default router;
