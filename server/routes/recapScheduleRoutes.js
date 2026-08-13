import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  requireOrgMembership,
  requireOrganizationParamMatch,
} from "../middleware/rbac.js";
import {
  upsertSchedule,
  getSchedule,
  getDeliveryHistory,
  retryDelivery,
} from "../controllers/recapScheduleController.js";

const router = express.Router();

// Issue #1381 authorization chain:
//   userAuth → org membership → (for :organizationId) path org matches membership
// Controllers then query with req.authorizedOrganizationId only.
router.use(userAuth);
router.use(requireOrgMembership);

// Static paths MUST be registered before "/:organizationId"
// so "history" / "retry" are not captured as organization ids.
router.get("/history/deliveries", getDeliveryHistory);
router.post("/retry/:deliveryId", retryDelivery);

router.get(
  "/:organizationId",
  requireOrganizationParamMatch("organizationId"),
  getSchedule,
);

router.put(
  "/:organizationId",
  requireOrganizationParamMatch("organizationId"),
  upsertSchedule,
);

export default router;
