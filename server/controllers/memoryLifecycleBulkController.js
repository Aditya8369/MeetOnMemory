import mongoose from "mongoose";
import Decision from "../models/decisionModel.js";
import ActionItem from "../models/actionItemModel.js";
import { bulkTransitionLifecycleStates } from "../services/memoryLifecycleService.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

const MODELS = Object.freeze({
  decision: Decision,
  actionItem: ActionItem,
});

const ALLOWED_TYPES = new Set(Object.keys(MODELS));
const ALLOWED_STATES = new Set(["active", "dormant", "archived", "expired"]);
const MAX_ITEMS = 200;

const getOrganization = (req) => req.user?.organization || null;

export const bulkTransitionMemoryLifecycle = async (req, res) => {
  try {
    const organization = getOrganization(req);
    const { items, state, reason = "" } = req.body || {};

    if (!organization) {
      return sendError(res, 400, "Organization context is required");
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, "At least one memory must be selected");
    }

    if (items.length > MAX_ITEMS) {
      return sendError(
        res,
        400,
        `A maximum of ${MAX_ITEMS} memories can be transitioned per request`,
      );
    }

    if (typeof state !== "string" || !ALLOWED_STATES.has(state)) {
      return sendError(
        res,
        400,
        "Invalid lifecycle state. Allowed values: active, dormant, archived, expired",
      );
    }

    if (typeof reason !== "string" || reason.length > 500) {
      return sendError(
        res,
        400,
        "Reason must be a string of at most 500 characters",
      );
    }

    const normalized = [];
    const seen = new Set();

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return sendError(
          res,
          400,
          "Each selected memory must include type and id",
        );
      }

      const { type, id } = item;

      if (typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
        return sendError(res, 400, `Unsupported memory type: ${type}`);
      }

      if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, `Invalid ${type} memory id`);
      }

      const key = `${type}:${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push({ type, id });
      }
    }

    const summary = await bulkTransitionLifecycleStates({
      organization,
      items: normalized,
      toState: state,
      reason: reason || `Bulk transition to ${state}`,
      triggeredBy: req.user?._id?.toString() || "admin",
    });

    return sendSuccess(
      res,
      { summary },
      `Bulk lifecycle transition completed for ${summary.transitioned} memories`,
    );
  } catch (error) {
    console.error("bulkTransitionMemoryLifecycle error:", error);
    return sendError(res, 500, "Failed to bulk transition memories");
  }
};

export default { bulkTransitionMemoryLifecycle };
