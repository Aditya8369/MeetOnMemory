import express from "express";
import { getDashboardMetrics } from "../controllers/dashboardController.js";
import { userAuth } from "../middleware/userAuth.js";
import { requireMembership } from "../middleware/requireMembership.js";

const router = express.Router();

router.use(userAuth);
router.use(requireMembership);

router.get("/metrics", getDashboardMetrics);

export default router;
