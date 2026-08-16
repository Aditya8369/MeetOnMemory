import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("openai", () => ({
  default: class OpenAI {},
}));

vi.mock("../services/knowledgeGraphService.js", () => ({
  buildOrganizationGraph: vi.fn(),
  buildMeetingGraph: vi.fn(),
  findPath: vi.fn(),
  getGraphAnalytics: vi.fn(),
  searchEntities: vi.fn(),
}));

vi.mock("../models/meetingModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

import mongoose from "mongoose";
import routes from "../routes/index.js";
import knowledgeGraphRoutes from "../routes/knowledgeGraphRoutes.js";
import Meeting from "../models/meetingModel.js";
import {
  buildOrganizationGraph,
  buildMeetingGraph,
  getGraphAnalytics,
  searchEntities,
} from "../services/knowledgeGraphService.js";
import {
  getOrganizationGraph,
  getMeetingGraph,
  getAnalytics,
  exportGraph,
  search,
  getEntity,
} from "../controllers/knowledgeGraphController.js";

const ORG_A = "507f1f77bcf86cd799439011";
const ORG_B = "507f1f77bcf86cd799439012";
const MEETING_ID = "507f1f77bcf86cd799439013";

function countMatchingLayers(router, pathStr) {
  const stack = router.stack || [];
  return stack.filter(
    (layer) => typeof layer.match === "function" && layer.match(pathStr),
  ).length;
}

const createRes = () => {
  const res = {
    statusCode: undefined,
    body: undefined,
    headers: {},
  };
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.send = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.setHeader = vi.fn((key, value) => {
    res.headers[key] = value;
  });
  return res;
};

/**
 * Builds a request whose `organization` is an ObjectId, exactly as `userAuth`
 * leaves it. The type matters: the export bug in Issue #1560 only reproduces
 * when the caller's organization is an ObjectId rather than a string.
 */
const createReq = ({ orgId = ORG_A, params = {}, query = {}, body } = {}) => ({
  params,
  query,
  body,
  user: {
    _id: new mongoose.Types.ObjectId(),
    organization: orgId ? new mongoose.Types.ObjectId(orgId) : undefined,
  },
});

describe("Knowledge Graph route mount and authorization (#1560)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildOrganizationGraph.mockResolvedValue({ nodes: [], edges: [] });
    buildMeetingGraph.mockResolvedValue({ nodes: [], edges: [] });
    getGraphAnalytics.mockResolvedValue({ nodeCount: 0 });
    searchEntities.mockResolvedValue([]);
  });

  describe("router registration", () => {
    it("mounts the knowledge graph router at /api/graph", () => {
      expect(countMatchingLayers(routes, "/api/graph")).toBe(1);
    });

    it("resolves the endpoints the client calls under that prefix", () => {
      for (const path of [
        "/api/graph/organization/" + ORG_A,
        "/api/graph/search",
        "/api/graph/export",
        "/api/graph/analytics/" + ORG_A,
        "/api/graph/meeting/" + MEETING_ID,
        "/api/graph/path",
      ]) {
        expect(countMatchingLayers(routes, path)).toBeGreaterThan(0);
      }
    });

    it("exports a usable Express router", () => {
      expect(typeof knowledgeGraphRoutes).toBe("function");
      expect((knowledgeGraphRoutes.stack || []).length).toBeGreaterThan(0);
    });

    it("does not register the prefix twice", () => {
      expect(countMatchingLayers(routes, "/api/graph")).toBe(1);
    });
  });

  describe("exportGraph organization comparison", () => {
    it("exports the caller's own graph when the body omits orgId", async () => {
      // The regression: KnowledgeGraph.jsx posts only { format }. The old
      // comparison put an ObjectId on one side and a String on the other, so
      // this returned 403 for every legitimate caller.
      const req = createReq({ body: { format: "json" } });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(200);
      expect(buildOrganizationGraph).toHaveBeenCalledWith(ORG_A);
      expect(res.headers["Content-Disposition"]).toBe(
        "attachment; filename=knowledge-graph.json",
      );
    });

    it("exports when orgId is supplied and matches the caller", async () => {
      const req = createReq({ body: { format: "json", orgId: ORG_A } });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(200);
      expect(buildOrganizationGraph).toHaveBeenCalledWith(ORG_A);
    });

    it("rejects an export for another organization", async () => {
      const req = createReq({ body: { format: "json", orgId: ORG_B } });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(403);
      expect(buildOrganizationGraph).not.toHaveBeenCalled();
    });

    it("rejects a caller with no organization", async () => {
      const req = createReq({ orgId: null, body: { format: "json" } });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(403);
      expect(buildOrganizationGraph).not.toHaveBeenCalled();
    });

    it("supports the csv format without falling through to 403", async () => {
      buildOrganizationGraph.mockResolvedValue({
        nodes: [{ id: "meeting-1", label: "Standup" }],
        edges: [{ source: "meeting-1", target: "decision-1" }],
      });
      const req = createReq({ body: { format: "csv" } });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers["Content-Type"]).toBe("text/csv");
      expect(typeof res.body).toBe("string");
    });

    it("rejects an unknown format with 400, not 403", async () => {
      const req = createReq({ body: { format: "pdf" } });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("tolerates a missing body", async () => {
      const req = createReq({ body: undefined });
      const res = createRes();

      await exportGraph(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe("getOrganizationGraph", () => {
    it("returns the graph for the caller's own organization", async () => {
      const req = createReq({ params: { orgId: ORG_A } });
      const res = createRes();

      await getOrganizationGraph(req, res);

      expect(res.statusCode).toBe(200);
      expect(buildOrganizationGraph).toHaveBeenCalledWith(ORG_A, {});
    });

    it("rejects another organization's graph", async () => {
      const req = createReq({ params: { orgId: ORG_B } });
      const res = createRes();

      await getOrganizationGraph(req, res);

      expect(res.statusCode).toBe(403);
      expect(buildOrganizationGraph).not.toHaveBeenCalled();
    });

    it("rejects a malformed organization id with 400", async () => {
      const req = createReq({ params: { orgId: "not-an-id" } });
      const res = createRes();

      await getOrganizationGraph(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("returns 403 rather than throwing when the caller has no organization", async () => {
      const req = createReq({ orgId: null, params: { orgId: ORG_A } });
      const res = createRes();

      await getOrganizationGraph(req, res);

      expect(res.statusCode).toBe(403);
    });

    it("passes date and entity-type filters through", async () => {
      const req = createReq({
        params: { orgId: ORG_A },
        query: {
          startDate: "2026-01-01",
          endDate: "2026-02-01",
          entityTypes: "meeting,decision",
        },
      });
      const res = createRes();

      await getOrganizationGraph(req, res);

      expect(buildOrganizationGraph).toHaveBeenCalledWith(ORG_A, {
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        entityTypes: ["meeting", "decision"],
      });
    });
  });

  describe("getMeetingGraph", () => {
    it("returns the subgraph for a meeting in the caller's organization", async () => {
      Meeting.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          organization: new mongoose.Types.ObjectId(ORG_A),
        }),
      });
      const req = createReq({ params: { meetingId: MEETING_ID } });
      const res = createRes();

      await getMeetingGraph(req, res);

      expect(res.statusCode).toBe(200);
      expect(buildMeetingGraph).toHaveBeenCalledWith(MEETING_ID);
    });

    it("authorizes before building the graph", async () => {
      Meeting.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          organization: new mongoose.Types.ObjectId(ORG_B),
        }),
      });
      const req = createReq({ params: { meetingId: MEETING_ID } });
      const res = createRes();

      await getMeetingGraph(req, res);

      expect(res.statusCode).toBe(403);
      // The old ordering built the graph first and only then checked access.
      expect(buildMeetingGraph).not.toHaveBeenCalled();
    });

    it("returns 404 for a meeting that does not exist", async () => {
      Meeting.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });
      const req = createReq({ params: { meetingId: MEETING_ID } });
      const res = createRes();

      await getMeetingGraph(req, res);

      expect(res.statusCode).toBe(404);
      expect(buildMeetingGraph).not.toHaveBeenCalled();
    });

    it("rejects a malformed meeting id with 400", async () => {
      const req = createReq({ params: { meetingId: "nope" } });
      const res = createRes();

      await getMeetingGraph(req, res);

      expect(res.statusCode).toBe(400);
      expect(Meeting.findById).not.toHaveBeenCalled();
    });
  });

  describe("getAnalytics", () => {
    it("returns analytics for the caller's organization", async () => {
      const req = createReq({ params: { orgId: ORG_A } });
      const res = createRes();

      await getAnalytics(req, res);

      expect(res.statusCode).toBe(200);
      expect(getGraphAnalytics).toHaveBeenCalledWith(ORG_A);
    });

    it("rejects another organization", async () => {
      const req = createReq({ params: { orgId: ORG_B } });
      const res = createRes();

      await getAnalytics(req, res);

      expect(res.statusCode).toBe(403);
      expect(getGraphAnalytics).not.toHaveBeenCalled();
    });
  });

  describe("search", () => {
    it("scopes the search to the caller's organization", async () => {
      const req = createReq({ query: { query: "budget", type: "decision" } });
      const res = createRes();

      await search(req, res);

      expect(res.statusCode).toBe(200);
      expect(searchEntities).toHaveBeenCalledWith(ORG_A, "budget", "decision");
    });

    it("requires a query string", async () => {
      const req = createReq({ query: {} });
      const res = createRes();

      await search(req, res);

      expect(res.statusCode).toBe(400);
      expect(searchEntities).not.toHaveBeenCalled();
    });

    it("rejects a caller with no organization before searching", async () => {
      const req = createReq({ orgId: null, query: { query: "budget" } });
      const res = createRes();

      await search(req, res);

      expect(res.statusCode).toBe(403);
      expect(searchEntities).not.toHaveBeenCalled();
    });
  });

  describe("getEntity", () => {
    it("rejects a malformed ObjectId entity id with 400", async () => {
      const req = createReq({ params: { type: "meeting", id: "not-an-id" } });
      const res = createRes();

      await getEntity(req, res);

      expect(res.statusCode).toBe(400);
      expect(buildOrganizationGraph).not.toHaveBeenCalled();
    });

    it("returns 404 when the entity is missing from the org graph", async () => {
      buildOrganizationGraph.mockResolvedValue({ nodes: [], edges: [] });
      const req = createReq({
        params: { type: "meeting", id: MEETING_ID },
      });
      const res = createRes();

      await getEntity(req, res);

      expect(res.statusCode).toBe(404);
      expect(buildOrganizationGraph).toHaveBeenCalledWith(ORG_A);
    });
  });
});
