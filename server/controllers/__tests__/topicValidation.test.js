import { describe, it, expect, vi, beforeEach } from "vitest";
import { renameCluster } from "../topicController.js";
import TopicCluster from "../../models/topicClusterModel.js";

vi.mock("../../models/topicClusterModel.js");

describe("Topic Controller Schema Validation (#1490)", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { clusterId: "507f1f77bcf86cd799439011" },
      body: {},
      user: { organization: "org123" },
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
});
