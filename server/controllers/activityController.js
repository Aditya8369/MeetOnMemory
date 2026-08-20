import mongoose from "mongoose";
import * as activityService from "../services/activityService.js";
import { parsePagination } from "../utils/pagination.js";

/**
 * Get activities for the user's current organization
 * GET /api/activities
 */
export const getActivities = async (req, res) => {
  try {
    const orgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return res
        .status(400)
        .json({ error: "Valid organization ID is required." });
    }

    const { action, actor } = req.query;

    // Use shared pagination helper to enforce hard limit upper bound (Issue #1668)
    const { page, limit } = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const sanitizedAction =
      typeof action === "string" ? action.trim().slice(0, 100) : undefined;
    const sanitizedActor =
      typeof actor === "string" ? actor.trim().slice(0, 100) : undefined;

    const result = await activityService.getOrgActivities(orgId, {
      page,
      limit,
      action: sanitizedAction,
      actor: sanitizedActor,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getActivities:", error);
    res.status(500).json({ error: "Failed to retrieve activities." });
  }
};

/**
 * Get activity statistics for the user's current organization
 * GET /api/activities/stats
 */
export const getActivityStats = async (req, res) => {
  try {
    const orgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return res
        .status(400)
        .json({ error: "Valid organization ID is required." });
    }

    const stats = await activityService.getActivityStats(orgId);

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error in getActivityStats:", error);
    res.status(500).json({ error: "Failed to retrieve activity stats." });
  }
};
