import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { requireAdminOrOwner } from "../middleware/rbac.js";
import { getAdminHealth } from "../controllers/adminHealthController.js";

const router = express.Router();

// Enforce authentication, rate limiting, and admin/owner access
router.use(userAuth, apiLimiter, requireAdminOrOwner);

// Fetch admin-only detailed dependency health report
router.get("/", getAdminHealth);

export default router;
