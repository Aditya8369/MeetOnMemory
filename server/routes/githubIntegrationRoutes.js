import express from "express";
import {
  initiateOAuth,
  handleCallback,
  getStatus,
  disconnect,
} from "../controllers/githubIntegrationController.js";
// Assuming there is an auth middleware
// import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/github/auth
router.get("/auth", initiateOAuth);

// GET /api/github/callback
router.get("/callback", handleCallback);

// GET /api/github/status/:organizationId
// Usually you'd protect this route: router.get("/status/:organizationId", protect, getStatus);
router.get("/status/:organizationId", getStatus);

// DELETE /api/github/disconnect/:organizationId
router.delete("/disconnect/:organizationId", disconnect);

export default router;
