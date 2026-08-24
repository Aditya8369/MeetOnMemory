import express from "express";
import actionItemSlaController from "../controllers/actionItemSlaController.js";
import requireAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(requireAuth);

// Get SLA Config for an organization
router.get("/config/:organizationId", actionItemSlaController.getConfig);

// Update SLA Config (Admin only ideally, but we'll stick to requireAuth for now or add role check if we know the syntax)
router.put("/config/:organizationId", actionItemSlaController.updateConfig);

// Get Breaches
router.get("/breaches/:organizationId", actionItemSlaController.getBreaches);

// Get Compliance Stats
router.get(
  "/stats/:organizationId",
  actionItemSlaController.getComplianceStats,
);

// Acknowledge a breach
router.post(
  "/breach/:breachId/acknowledge",
  actionItemSlaController.acknowledgeBreach,
);

export default router;
