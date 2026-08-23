import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { requireAdminOrOwner } from "../middleware/rbac.js";
import {
  getImportanceRecalculationStatus,
  triggerImportanceRecalculation,
} from "../controllers/adminImportanceController.js";

const router = express.Router();

router.use(userAuth, apiLimiter, requireAdminOrOwner);

router.get("/status", getImportanceRecalculationStatus);
router.post("/recalculate", writeLimiter, triggerImportanceRecalculation);

export default router;
