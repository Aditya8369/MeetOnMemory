import express from "express";
import {
  getConfig,
  updateConfig,
  disconnect,
} from "../controllers/issueTrackerController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

router.get("/:provider/config", getConfig);
router.post("/:provider/config", updateConfig);
router.delete("/:provider/disconnect", disconnect);

export default router;
