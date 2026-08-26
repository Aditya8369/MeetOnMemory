import express from "express";
import {
  createDefinition,
  getDefinitions,
  updateDefinition,
  deleteDefinition,
  setMeetingFields,
  getMeetingFields,
} from "../controllers/customFieldController.js";
import requireAuth from "../middleware/userAuth.js";
import { requireOrgMembership, requireRole } from "../middleware/rbac.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireOrgMembership);

const requireOrgAdmin = requireRole(["admin", "owner"]);

// Organization-level definitions. :orgId is kept for API compatibility;
// handlers always scope to req.user.organization.
router.get("/org/:orgId", getDefinitions);
router.post("/org/:orgId", requireOrgAdmin, createDefinition);
router.patch("/org/:orgId/:definitionId", requireOrgAdmin, updateDefinition);
router.delete("/org/:orgId/:definitionId", requireOrgAdmin, deleteDefinition);

router.post("/meeting/:meetingId", setMeetingFields);
router.get("/meeting/:meetingId", getMeetingFields);

export default router;
