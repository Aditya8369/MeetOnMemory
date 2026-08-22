import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { requireAdminOrOwner } from "../middleware/rbac.js";
import {
  getEmbeddingAdminStatus,
  getEmbeddingJobStatus,
  postReindexMeeting,
  postReindexOrg,
} from "../controllers/adminReindexController.js";

const router = express.Router();

router.use(userAuth, apiLimiter, requireAdminOrOwner);

router.get("/", getEmbeddingAdminStatus);
router.get("/jobs/:jobId", getEmbeddingJobStatus);
router.post("/reindex/meeting/:meetingId", writeLimiter, postReindexMeeting);
router.post("/reindex/org", writeLimiter, postReindexOrg);

export default router;
