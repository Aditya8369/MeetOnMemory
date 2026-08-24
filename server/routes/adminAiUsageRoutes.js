import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { requireAdminOrOwner } from "../middleware/rbac.js";
import { getAdminAiUsage } from "../controllers/adminAiUsageController.js";

const router = express.Router();

router.get("/", userAuth, apiLimiter, requireAdminOrOwner, getAdminAiUsage);

export default router;
