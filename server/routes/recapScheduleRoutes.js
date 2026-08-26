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
  getFailedDeliveries,
  dryRunDelivery,
  retryDelivery,
} from "../controllers/recapScheduleController.js";

const router = express.Router();

/**
 * Recap schedule + delivery history routes.
 *
 * Issue #1401 — Recap History must be reachable as a static path.
 * The original registration placed `GET /history/deliveries` *after*
 * `GET /:organizationId`, so Express treated "history" as an organizationId
 * and the history endpoint never ran.
 *
 * Authorization chain (Issue #1381 / #1401):
 *   userAuth → requireOrgMembership
 *   → static history/retry handlers
 *   → :organizationId handlers with requireOrganizationParamMatch
 *
 * Controllers query only server-resolved membership / ownership — never
 * trust client-supplied organization identifiers.
 */
router.use(userAuth);
router.use(requireOrgMembership);

// Static paths MUST be registered before "/:organizationId"
// so "history" / "retry" are not captured as organization ids (#1401).
router.get("/history/deliveries", getDeliveryHistory);
router.get("/history/failed", getFailedDeliveries);
router.post("/retry/:deliveryId", retryDelivery);
router.post(
  "/:organizationId/dry-run",
  requireOrganizationParamMatch("organizationId"),
  dryRunDelivery,
);

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
