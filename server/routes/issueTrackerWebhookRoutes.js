import express from "express";
import {
  handleJiraWebhook,
  handleLinearWebhook,
} from "../controllers/issueTrackerWebhookController.js";

const router = express.Router();

router.post("/jira", handleJiraWebhook);
router.post("/linear", handleLinearWebhook);

export default router;
