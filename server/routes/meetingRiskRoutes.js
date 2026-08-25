import express from "express";
import protect from "../middleware/userAuth.js";
import {
  createRisk,
  getRisksByOrganization,
  getRisksByMeeting,
  updateRisk,
  deleteRisk,
  linkActionItem,
} from "../controllers/meetingRiskController.js";

const router = express.Router();

router.use(protect);

router.post("/", createRisk);
router.get("/organization/:organizationId", getRisksByOrganization);
router.get("/meeting/:meetingId", getRisksByMeeting);
router.put("/:riskId", updateRisk);
router.delete("/:riskId", deleteRisk);
router.post("/:riskId/action-items", linkActionItem);

export default router;
