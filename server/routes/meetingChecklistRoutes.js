import express from "express";
import * as meetingChecklistController from "../controllers/meetingChecklistController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router({ mergeParams: true });

// All routes require user authentication
router.use(userAuth);

router.post("/", meetingChecklistController.createChecklist);
router.get("/", meetingChecklistController.getChecklist);
router.put("/", meetingChecklistController.updateChecklist);
router.delete("/", meetingChecklistController.deleteChecklist);
router.patch("/toggle", meetingChecklistController.toggleItem);
router.get("/readiness", meetingChecklistController.getReadiness);

export default router;
