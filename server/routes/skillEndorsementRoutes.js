import express from "express";
import {
  createEndorsement,
  getMeetingEndorsements,
  getUserEndorsements,
} from "../controllers/skillEndorsementController.js";
import requireAuth from "../middleware/userAuth.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.post("/", createEndorsement);
router.get("/meeting/:meetingId", getMeetingEndorsements);
router.get("/user/:userId", getUserEndorsements);

export default router;
