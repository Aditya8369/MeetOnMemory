import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSnapshots,
  getSnapshot,
  exportSnapshot,
  getSnapshotDiff,
  createManualSnapshot,
} from "../controllers/graphSnapshotController.js";
import * as graphSnapshotService from "../services/graphSnapshotService.js";

vi.mock("../services/graphSnapshotService.js");

describe("graphSnapshotController", () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: {
        _id: "user123",
        organization: "org123",
      },
      query: {},
      params: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };
  });

  describe("getSnapshots", () => {
    it("should fetch snapshot timeline for the organization", async () => {
      const mockSnapshots = [{ _id: "snap1", trigger: "manual" }];
      vi.spyOn(graphSnapshotService, "listSnapshots").mockResolvedValue(
        mockSnapshots,
      );

      await getSnapshots(req, res);

      expect(graphSnapshotService.listSnapshots).toHaveBeenCalledWith(
        "org123",
        { limit: undefined, before: undefined },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        count: 1,
        snapshots: mockSnapshots,
      });
    });
  });

  describe("getSnapshot", () => {
    it("should return 400 for invalid snapshot ID", async () => {
      req.params.id = "invalid-id";

      await getSnapshot(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid snapshot ID",
      });
    });

    it("should return full snapshot data for valid ID", async () => {
      req.params.id = "507f1f77bcf86cd799439011";
      const mockSnapshot = { _id: req.params.id, nodes: [], edges: [] };
      vi.spyOn(graphSnapshotService, "getSnapshotById").mockResolvedValue(
        mockSnapshot,
      );

      await getSnapshot(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        snapshot: mockSnapshot,
      });
    });

    it("should return 404 if snapshot is not found", async () => {
      req.params.id = "507f1f77bcf86cd799439011";
      vi.spyOn(graphSnapshotService, "getSnapshotById").mockResolvedValue(null);

      await getSnapshot(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Snapshot not found",
      });
    });
  });

  describe("exportSnapshot", () => {
    it("should set Attachment header and return snapshot", async () => {
      req.params.id = "507f1f77bcf86cd799439011";
      const mockSnapshot = { _id: req.params.id, nodes: [], edges: [] };
      vi.spyOn(graphSnapshotService, "getSnapshotById").mockResolvedValue(
        mockSnapshot,
      );

      await exportSnapshot(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        `attachment; filename="graph-snapshot-${req.params.id}.json"`,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        snapshot: mockSnapshot,
      });
    });
  });

  describe("getSnapshotDiff", () => {
    it("should return 400 if from or to is missing", async () => {
      req.query = { from: "507f1f77bcf86cd799439011" };

      await getSnapshotDiff(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Both 'from' and 'to' snapshot IDs are required",
      });
    });

    it("should return computed diff between two valid snapshots", async () => {
      req.query = {
        from: "507f1f77bcf86cd799439011",
        to: "507f1f77bcf86cd799439012",
      };
      const mockDiff = { addedNodes: [], removedNodes: [], modifiedNodes: [] };
      vi.spyOn(graphSnapshotService, "diffSnapshots").mockResolvedValue(
        mockDiff,
      );

      await getSnapshotDiff(req, res);

      expect(graphSnapshotService.diffSnapshots).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "org123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        diff: mockDiff,
      });
    });
  });

  describe("createManualSnapshot", () => {
    it("should trigger manual snapshot capture and return 201 on success", async () => {
      const mockSnapshot = { _id: "snap2", trigger: "manual" };
      vi.spyOn(graphSnapshotService, "captureSnapshot").mockResolvedValue({
        skipped: false,
        snapshot: mockSnapshot,
      });

      await createManualSnapshot(req, res);

      expect(graphSnapshotService.captureSnapshot).toHaveBeenCalledWith(
        "org123",
        {
          trigger: "manual",
          triggeredBy: "user123",
          force: false,
        },
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        skipped: false,
        snapshot: mockSnapshot,
      });
    });

    it("should handle skipped duplicate snapshot", async () => {
      vi.spyOn(graphSnapshotService, "captureSnapshot").mockResolvedValue({
        skipped: true,
      });

      await createManualSnapshot(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "No graph changes since the last snapshot; nothing captured.",
        skipped: true,
      });
    });
  });
});
