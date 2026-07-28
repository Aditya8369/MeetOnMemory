import mongoose from "mongoose";
import {
  captureSnapshot,
  listSnapshots,
  getSnapshotById,
  diffSnapshots,
} from "../services/graphSnapshotService.js";
import { sanitizeFilenameForHeader } from "../utils/fileUtils.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/knowledge/graph/snapshots?limit=50&before=<ISO date>
 * Timeline listing (metadata only, no node/edge payload).
 */
export const getSnapshots = async (req, res) => {
  try {
    const organization = req.user.organization || null;
    const { limit, before } = req.query;

    const snapshots = await listSnapshots(organization, { limit, before });

    res.status(200).json({
      success: true,
      count: snapshots.length,
      snapshots,
    });
  } catch (error) {
    console.error("getSnapshots error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch graph snapshots",
    });
  }
};

/**
 * GET /api/knowledge/graph/snapshots/:id
 * Full snapshot (nodes + edges) for rendering a historical graph.
 */
export const getSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid snapshot ID" });
    }

    const organization = req.user.organization || null;
    const snapshot = await getSnapshotById(id, organization);

    if (!snapshot) {
      return res
        .status(404)
        .json({ success: false, message: "Snapshot not found" });
    }

    res.status(200).json({ success: true, snapshot });
  } catch (error) {
    console.error("getSnapshot error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch graph snapshot",
    });
  }
};

/**
 * GET /api/knowledge/graph/snapshots/:id/export
 * Same payload as getSnapshot, but intended for download/audit tooling
 * (content-disposition hints the client to save rather than render).
 */
export const exportSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid snapshot ID" });
    }

    const organization = req.user.organization || null;
    const snapshot = await getSnapshotById(id, organization);

    if (!snapshot) {
      return res
        .status(404)
        .json({ success: false, message: "Snapshot not found" });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizeFilenameForHeader(`graph-snapshot-${id}`)}.json"`,
    );
    res.status(200).json({ success: true, snapshot });
  } catch (error) {
    console.error("exportSnapshot error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export graph snapshot",
    });
  }
};

/**
 * GET /api/knowledge/graph/snapshots/diff?from=<id>&to=<id>
 * Node/edge-level diff between any two snapshots for the caller's org.
 */
export const getSnapshotDiff = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Both 'from' and 'to' snapshot IDs are required",
      });
    }
    if (!isValidObjectId(from) || !isValidObjectId(to)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid snapshot ID(s)" });
    }

    const organization = req.user.organization || null;
    const diff = await diffSnapshots(from, to, organization);

    res.status(200).json({ success: true, diff });
  } catch (error) {
    console.error("getSnapshotDiff error:", error);
    const notFound = /not found/i.test(error.message);
    res.status(notFound ? 404 : 500).json({
      success: false,
      message: notFound
        ? error.message
        : "Failed to compute graph snapshot diff",
    });
  }
};

/**
 * POST /api/knowledge/graph/snapshots
 * Manually triggers a snapshot capture (e.g. before/after a bulk edit).
 * Skips writing a duplicate if nothing has changed since the last capture,
 * unless { "force": true } is passed.
 */
export const createManualSnapshot = async (req, res) => {
  try {
    const organization = req.user.organization || null;
    const { force = false } = req.body || {};

    const result = await captureSnapshot(organization, {
      trigger: "manual",
      triggeredBy: req.user._id,
      force: Boolean(force),
    });

    if (result.skipped) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "No graph changes since the last snapshot; nothing captured.",
      });
    }

    res.status(201).json({
      success: true,
      skipped: false,
      snapshot: result.snapshot,
    });
  } catch (error) {
    console.error("createManualSnapshot error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create graph snapshot",
    });
  }
};
