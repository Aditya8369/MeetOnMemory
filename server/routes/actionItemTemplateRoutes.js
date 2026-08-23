import express from "express";
import * as actionItemTemplateController from "../controllers/actionItemTemplateController.js";
import userAuth from "../middleware/userAuth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();
router.use(userAuth);

router.post(
  "/",
  requirePermission("tasks", "create"),
  actionItemTemplateController.createTemplate,
);

router.get(
  "/",
  requirePermission("tasks", "view"),
  actionItemTemplateController.getTemplates,
);

router.get(
  "/:id",
  requirePermission("tasks", "view"),
  actionItemTemplateController.getTemplateById,
);

router.put(
  "/:id",
  requirePermission("tasks", "create"),
  actionItemTemplateController.updateTemplate,
);

router.delete(
  "/:id",
  requirePermission("tasks", "create"),
  actionItemTemplateController.deleteTemplate,
);

router.post(
  "/apply",
  requirePermission("tasks", "create"),
  actionItemTemplateController.applyTemplate,
);

export default router;
