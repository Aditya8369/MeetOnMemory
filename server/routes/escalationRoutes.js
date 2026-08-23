import express from "express";
import {
  getEscalationPolicies,
  getEscalationPolicyById,
  createEscalationPolicy,
  updateEscalationPolicy,
  deleteEscalationPolicy,
  getEscalationPolicyDashboard,
} from "../controllers/escalationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// Protected routes (apply requireAuth if necessary, relying on global setup usually)
router.use(userAuth);

router.get("/dashboard", getEscalationPolicyDashboard);
router.get("/", getEscalationPolicies);
router.get("/:id", getEscalationPolicyById);
router.post("/", createEscalationPolicy);
router.put("/:id", updateEscalationPolicy);
router.delete("/:id", deleteEscalationPolicy);

export default router;
