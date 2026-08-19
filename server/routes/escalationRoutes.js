import express from "express";
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getEscalationDashboardMetrics,
} from "../controllers/escalationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// Protected routes (apply requireAuth if necessary, relying on global setup usually)
router.use(userAuth);

router.get("/dashboard", getEscalationDashboardMetrics);
router.get("/", getPolicies);
router.get("/:id", getPolicyById);
router.post("/", createPolicy);
router.put("/:id", updatePolicy);
router.delete("/:id", deletePolicy);

export default router;
