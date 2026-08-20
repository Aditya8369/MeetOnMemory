import express from "express";
import {
  addDependency,
  removeDependency,
  getDependencies,
} from "../controllers/actionItemDependencyController.js";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership } from "../middleware/rbac.js";

const router = express.Router();

router.use(userAuth);
router.use(requireOrgMembership);

router.post("/", addDependency);
router.delete("/:dependentId/:blockerId", removeDependency);
router.get("/:itemId", getDependencies);

export default router;
