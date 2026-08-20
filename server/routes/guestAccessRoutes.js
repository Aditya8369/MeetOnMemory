import express from "express";
import { protect } from "../middleware/userAuth.js";
import GuestAccessController from "../controllers/guestAccessController.js";

const router = express.Router();

// --- Authenticated Host Routes ---
router.post(
  "/meetings/:meetingId/guest-tokens",
  protect,
  GuestAccessController.createToken,
);
router.get(
  "/meetings/:meetingId/guest-tokens",
  protect,
  GuestAccessController.getMeetingTokens,
);
router.post(
  "/guest-tokens/:tokenId/revoke",
  protect,
  GuestAccessController.revokeToken,
);

// --- Unauthenticated Guest Routes ---
router.get("/guest/meeting/:token", GuestAccessController.getGuestMeetingData);
router.post(
  "/guest/meeting/:token/comments",
  GuestAccessController.addGuestComment,
);

export default router;
