import {
  buildOrganizationGraph,
  buildMeetingGraph,
  findPath,
  getGraphAnalytics,
  searchEntities,
} from "../services/knowledgeGraphService.js";
import mongoose from "mongoose";

/**
 * Knowledge Graph Controller
 * Handles HTTP requests for knowledge graph endpoints
 */

/**
 * Compares two organization references without assuming either is a string.
 *
 * `req.user.organization` is a Mongoose `ObjectId`; values arriving from
 * `req.params` or `req.body` are strings. Comparing them with `!==` directly is
 * always true, which is how `exportGraph` came to reject every caller — see
 * Issue #1560. Returns false when either side is missing so an absent
 * organization can never be read as a match.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
const sameOrganization = (a, b) => {
  if (!a || !b) return false;
  return a.toString() === b.toString();
};

/**
 * The caller's organization, or null when they belong to none.
 *
 * Every handler here is organization-scoped, so a user without an organization
 * has nothing to read rather than everything — returning null lets each handler
 * answer 403 instead of throwing on `.toString()` of undefined.
 *
 * @param {import("express").Request} req
 * @returns {string|null}
 */
const callerOrganization = (req) =>
  req.user?.organization ? req.user.organization.toString() : null;

const FORBIDDEN = { message: "Forbidden: Not part of organization" };

/**
 * @desc Get full organization graph
 * @route GET /api/graph/organization/:orgId
 * @access Private
 */
export const getOrganizationGraph = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { startDate, endDate, entityTypes } = req.query;

    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    // Check organization access
    if (!sameOrganization(orgId, callerOrganization(req))) {
      return res.status(403).json(FORBIDDEN);
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (entityTypes) filters.entityTypes = entityTypes.split(",");

    const graph = await buildOrganizationGraph(orgId, filters);

    res.status(200).json(graph);
  } catch (error) {
    console.error("Error fetching organization graph:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get meeting-specific subgraph
 * @route GET /api/graph/meeting/:meetingId
 * @access Private
 */
export const getMeetingGraph = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({ message: "Invalid meeting ID" });
    }

    // Authorize before building the graph. The check used to run afterwards,
    // which meant an unauthorized caller still paid for a full graph
    // traversal — and any error raised while building it was reported before
    // the caller was ever told they had no access to the meeting.
    const Meeting = (await import("../models/meetingModel.js")).default;
    const meeting = await Meeting.findById(meetingId).select("organization");
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (!sameOrganization(meeting.organization, callerOrganization(req))) {
      return res.status(403).json(FORBIDDEN);
    }

    const graph = await buildMeetingGraph(meetingId);

    res.status(200).json(graph);
  } catch (error) {
    console.error("Error fetching meeting graph:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get specific entity and its relationships
 * @route GET /api/graph/entity/:type/:id
 * @access Private
 */
export const getEntity = async (req, res) => {
  try {
    const { type, id } = req.params;
    const orgId = callerOrganization(req);

    if (!orgId) {
      return res.status(403).json(FORBIDDEN);
    }

    const graph = await buildOrganizationGraph(orgId);
    const { nodes, edges } = graph;

    const entityId = `${type}-${id}`;
    const entity = nodes.find((n) => n.id === entityId);

    if (!entity) {
      return res.status(404).json({ message: "Entity not found" });
    }

    // Find all relationships
    const relationships = edges.filter(
      (e) => e.source === entityId || e.target === entityId,
    );

    // Get related entities
    const relatedIds = relationships.map((e) =>
      e.source === entityId ? e.target : e.source,
    );
    const relatedEntities = nodes.filter((n) => relatedIds.includes(n.id));

    res.status(200).json({
      entity,
      relationships,
      relatedEntities,
    });
  } catch (error) {
    console.error("Error fetching entity:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Find path between two entities
 * @route GET /api/graph/path
 * @access Private
 */
export const findPathEndpoint = async (req, res) => {
  try {
    const { startId, endId } = req.query;
    const orgId = callerOrganization(req);

    if (!orgId) {
      return res.status(403).json(FORBIDDEN);
    }

    if (!startId || !endId) {
      return res.status(400).json({ message: "Start and end IDs required" });
    }

    const path = await findPath(orgId, startId, endId);

    res.status(200).json(path);
  } catch (error) {
    console.error("Error finding path:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get graph analytics
 * @route GET /api/graph/analytics/:orgId
 * @access Private
 */
export const getAnalytics = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    if (!sameOrganization(orgId, callerOrganization(req))) {
      return res.status(403).json(FORBIDDEN);
    }

    const analytics = await getGraphAnalytics(orgId);

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error fetching graph analytics:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Export graph data
 * @route POST /api/graph/export
 * @access Private
 */
export const exportGraph = async (req, res) => {
  try {
    const { format = "json", orgId } = req.body || {};
    const callerOrgId = callerOrganization(req);

    if (!callerOrgId) {
      return res.status(403).json(FORBIDDEN);
    }

    // `orgId` is optional: the Knowledge Graph page posts only `{ format }`.
    // Defaulting to the caller's own organization has to happen before the
    // comparison, and the comparison has to be string-to-string — the previous
    // `organizationId !== req.user.organization.toString()` compared an
    // ObjectId against a String and so rejected every request that omitted
    // `orgId`, which is every request the client makes.
    const organizationId = orgId ? orgId.toString() : callerOrgId;

    if (!sameOrganization(organizationId, callerOrgId)) {
      return res.status(403).json(FORBIDDEN);
    }

    const graph = await buildOrganizationGraph(organizationId);

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=knowledge-graph.json",
      );
      res.status(200).json(graph);
    } else if (format === "csv") {
      // Convert to CSV format
      const csvNodes = convertToCSV(graph.nodes, "nodes");
      const csvEdges = convertToCSV(graph.edges, "edges");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=knowledge-graph.csv",
      );
      res.status(200).send(`${csvNodes}\n\n${csvEdges}`);
    } else {
      res.status(400).json({ message: "Invalid format. Use 'json' or 'csv'" });
    }
  } catch (error) {
    console.error("Error exporting graph:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Helper to convert array to CSV
 */
const convertToCSV = (data, _type) => {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const value = item[header];
        if (typeof value === "object") {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};

/**
 * @desc Search entities
 * @route GET /api/graph/search
 * @access Private
 */
export const search = async (req, res) => {
  try {
    const { query, type } = req.query;
    const orgId = callerOrganization(req);

    if (!orgId) {
      return res.status(403).json(FORBIDDEN);
    }

    if (!query) {
      return res.status(400).json({ message: "Search query required" });
    }

    const results = await searchEntities(orgId, query, type);

    res.status(200).json({ results, count: results.length });
  } catch (error) {
    console.error("Error searching entities:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
