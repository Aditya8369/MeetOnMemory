import express from "express";
import { createRequire } from "module";
import protect from "../middleware/userAuth.js";

const require = createRequire(import.meta.url);
const meetingRiskController = require("../controllers/meetingRiskController.js");

const router = express.Router();

router.use(protect);

router.post("/", meetingRiskController.createRisk);
router.get(
  "/organization/:organizationId",
  meetingRiskController.getRisksByOrganization,
);
router.get("/meeting/:meetingId", meetingRiskController.getRisksByMeeting);
router.put("/:riskId", meetingRiskController.updateRisk);
router.delete("/:riskId", meetingRiskController.deleteRisk);
router.post("/:riskId/action-items", meetingRiskController.linkActionItem);

export default router;
