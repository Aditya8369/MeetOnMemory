import mongoose from "mongoose";
import ActionItem from "../models/actionItemModel.js";
import Decision from "../models/decisionModel.js";
import AuditLog from "../models/auditLogModel.js";
import { restoreMemory } from "../services/memoryLifecycleService.js";
import {
  ALLOWED_ARCHIVE_TYPES,
  getArchivedMemoriesPage,
} from "../services/archivedKnowledgeService.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

const MODEL_BY_TYPE = {
  decision: Decision,
  "action-item": ActionItem,
};

const SERVICE_TYPE_BY_TYPE = {
  decision: "decision",
  "action-item": "actionItem",
};

const MAX_BULK_RESTORE_ITEMS = 100;

const sanitizeOrganization = (organization) => {
  if (!organization) return null;
  if (organization instanceof mongoose.Types.ObjectId) return organization;
  if (typeof organization === "object" && organization._id) {
    return sanitizeOrganization(organization._id);
  }
  return String(organization);
};

export const getArchivedMemoriesWithFacets = async (req, res) => {
  try {
    const { type = "all", search, tag } = req.query || {};
    const organization = sanitizeOrganization(req.user?.organization);

    if (!organization) {
      return sendError(res, 400, "Organization required");
    }

    if (typeof type !== "string" || !ALLOWED_ARCHIVE_TYPES.includes(type)) {
      return sendError(
        res,
        400,
        `Invalid type. Allowed values: ${ALLOWED_ARCHIVE_TYPES.join(", ")}`,
      );
    }

    if (search !== undefined && search !== null && typeof search !== "string") {
      return sendError(res, 400, "Invalid search");
    }

    if (tag !== undefined && tag !== null && typeof tag !== "string") {
      return sendError(res, 400, "Invalid tag");
    }

    const result = await getArchivedMemoriesPage({
      organization,
      type,
      search,
      tag,
      page: req.query.page,
      limit: req.query.limit,
    });

    return sendSuccess(res, result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("getArchivedMemoriesWithFacets error:", error);
    return sendError(res, 500, "Failed to fetch archived memories");
  }
};

/**
 * Restores archived memories in an isolated per-item loop. One bad/deleted
 * item does not roll back successful restores, allowing the client to report
 * partial failures instead of losing the whole batch.
 */
export const bulkRestoreArchivedMemories = async (req, res) => {
  try {
    const { items, reason } = req.body || {};
    const organization = sanitizeOrganization(req.user?.organization);

    if (!organization) {
      return sendError(res, 400, "Organization required");
    }

    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > MAX_BULK_RESTORE_ITEMS
    ) {
      return sendError(
        res,
        400,
        `items must contain between 1 and ${MAX_BULK_RESTORE_ITEMS} memories`,
      );
    }

    if (reason !== undefined && reason !== null && typeof reason !== "string") {
      return sendError(res, 400, "Invalid restore reason");
    }

    const restoreReason =
      reason?.trim() || "Bulk restored from Knowledge Archive Browser";
    const results = [];

    for (const item of items) {
      const type = item?.type;
      const id = item?.id;

      if (
        typeof type !== "string" ||
        !Object.prototype.hasOwnProperty.call(MODEL_BY_TYPE, type) ||
        typeof id !== "string" ||
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        results.push({
          type: type || null,
          id: id || null,
          success: false,
          message: "Invalid memory type or id",
        });
        continue;
      }

      const Model = MODEL_BY_TYPE[type];
      const serviceType = SERVICE_TYPE_BY_TYPE[type];

      try {
        const document = await Model.findOne({
          _id: new mongoose.Types.ObjectId(id),
          organization,
          lifecycleState: "archived",
        });

        if (!document) {
          results.push({
            type,
            id,
            success: false,
            message: "Archived memory not found",
          });
          continue;
        }

        const updated = await restoreMemory(serviceType, document._id, {
          triggeredBy: req.user?._id?.toString() || "admin",
          reason: restoreReason,
        });

        if (!updated) {
          results.push({
            type,
            id,
            success: false,
            message: "Memory could not be restored",
          });
          continue;
        }

        await AuditLog.create({
          organization,
          actor: req.user?._id,
          action: "memory_lifecycle_transition",
          entity: type === "decision" ? "Decision" : "ActionItem",
          entityId: document._id,
          details: {
            fromState: "archived",
            toState: "active",
            reason: restoreReason,
            bulk: true,
          },
        });

        results.push({
          type,
          id,
          success: true,
          lifecycleState: updated.lifecycleState,
        });
      } catch (error) {
        console.error("bulkRestoreArchivedMemories item failed:", error);
        results.push({
          type,
          id,
          success: false,
          message: "Failed to restore memory",
        });
      }
    }

    const restored = results.filter((result) => result.success).length;
    const failed = results.length - restored;

    return sendSuccess(res, {
      restored,
      failed,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("bulkRestoreArchivedMemories error:", error);
    return sendError(res, 500, "Failed to bulk restore archived memories");
  }
};
