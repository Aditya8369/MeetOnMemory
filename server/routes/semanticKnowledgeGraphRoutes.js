import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  extractSemanticGraphFromMeeting,
  getSemanticNeighborhood,
} from "../controllers/semanticKnowledgeGraphController.js";

const router = express.Router();

router.use(userAuth);

router.get("/meeting/:meetingId", extractSemanticGraphFromMeeting);
router.get("/neighborhood", getSemanticNeighborhood);

export default router;
