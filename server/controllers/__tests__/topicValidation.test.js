import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renameCluster,
  deleteCluster,
  mergeClusters,
} from "../topicController.js";
import TopicCluster from "../../models/topicClusterModel.js";
import MeetingTopic from "../../models/meetingTopicModel.js";

vi.mock("../../models/topicClusterModel.js");
vi.mock("../../models/meetingTopicModel.js");

describe("Topic Controller Schema Validation (#1490, #2028)", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { clusterId: "507f1f77bcf86cd799439011" },
      body: {},
      user: { organization: "507f1f77bcf86cd799439099" },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("returns 400 Bad Request when label is empty or missing", async () => {
    req.body = { label: "   " };

    await renameCluster(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.any(String) }),
    );
  });

  it("returns 400 Bad Request when label exceeds 120 characters", async () => {
    req.body = { label: "a".repeat(121) };

    await renameCluster(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/120 characters/i),
      }),
    );
  });

  it("renames cluster successfully with valid label", async () => {
    req.body = { label: "Engineering Updates" };
    const mockCluster = {
      label: "Old Label",
      isUserRenamed: false,
      save: vi.fn().mockResolvedValue(true),
    };
    TopicCluster.findOne.mockResolvedValue(mockCluster);

    await renameCluster(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockCluster.label).toBe("Engineering Updates");
    expect(mockCluster.isUserRenamed).toBe(true);
    expect(mockCluster.save).toHaveBeenCalled();
  });

  describe("deleteCluster (#2028)", () => {
    it("returns 400 on invalid cluster ID", async () => {
      req.params.clusterId = "invalid-id";

      await deleteCluster(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Invalid cluster ID",
        }),
      );
    });

    it("returns 404 when cluster not found", async () => {
      TopicCluster.findOneAndDelete.mockResolvedValue(null);

      await deleteCluster(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: "Cluster not found" }),
      );
    });

    it("deletes cluster and unlinks meeting topics successfully", async () => {
      const mockCluster = { _id: "507f1f77bcf86cd799439011" };
      TopicCluster.findOneAndDelete.mockResolvedValue(mockCluster);
      MeetingTopic.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await deleteCluster(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(TopicCluster.findOneAndDelete).toHaveBeenCalledWith({
        _id: "507f1f77bcf86cd799439011",
        organization: "507f1f77bcf86cd799439099",
      });
      expect(MeetingTopic.updateMany).toHaveBeenCalled();
    });
  });

  describe("mergeClusters (#2028)", () => {
    it("returns 400 on invalid target cluster ID", async () => {
      req.body = { targetClusterId: "invalid-id" };

      await mergeClusters(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when merging cluster into itself", async () => {
      req.body = { targetClusterId: "507f1f77bcf86cd799439011" };

      await mergeClusters(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Cannot merge a cluster into itself",
        }),
      );
    });

    it("merges source cluster into target cluster successfully", async () => {
      const targetId = "507f1f77bcf86cd799439022";
      req.body = { targetClusterId: targetId };

      const sourceCluster = {
        _id: "507f1f77bcf86cd799439011",
        canonicalTopicNames: ["Sprint Retro"],
        meetingCount: 2,
      };
      const targetCluster = {
        _id: targetId,
        canonicalTopicNames: ["Sprint Planning"],
        meetingCount: 4,
        save: vi.fn().mockResolvedValue(true),
      };

      TopicCluster.findOne.mockImplementation(({ _id }) => {
        if (_id === "507f1f77bcf86cd799439011")
          return Promise.resolve(sourceCluster);
        if (_id === targetId) return Promise.resolve(targetCluster);
        return Promise.resolve(null);
      });
      TopicCluster.findByIdAndDelete.mockResolvedValue(sourceCluster);
      MeetingTopic.updateMany.mockResolvedValue({ modifiedCount: 2 });
      MeetingTopic.find.mockResolvedValue([]);

      await mergeClusters(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(TopicCluster.findByIdAndDelete).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(targetCluster.save).toHaveBeenCalled();
    });
  });
});
