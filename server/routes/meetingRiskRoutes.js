const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const meetingRiskController = require("../controllers/meetingRiskController");

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

module.exports = router;
