import express from "express";
import {
  initiateOAuth,
  handleCallback,
  getStatus,
  disconnect,
  updateRepository,
  syncActionItem,
} from "../controllers/githubIntegrationController.js";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership } from "../middleware/rbac.js";

const router = express.Router();

// OAuth flow — callback does not have a session cookie yet (redirect from GitHub)
router.get("/auth", userAuth, initiateOAuth);
router.get("/callback", handleCallback);

// Protected organization-scoped routes
router.get(
  "/status/:organizationId",
  userAuth,
  requireOrgMembership,
  getStatus,
);
router.delete(
  "/disconnect/:organizationId",
  userAuth,
  requireOrgMembership,
  disconnect,
);
router.patch(
  "/repository/:organizationId",
  userAuth,
  requireOrgMembership,
  updateRepository,
);

// Manual sync trigger
router.post("/sync", userAuth, requireOrgMembership, syncActionItem);

export default router;
