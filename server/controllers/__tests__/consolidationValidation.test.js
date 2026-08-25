import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  runConsolidation,
  getConsolidationHistory,
} from "../consolidationController.js";
import { consolidateMemories } from "../../services/memoryConsolidationService.js";

vi.mock("../../services/memoryConsolidationService.js", () => ({
  MODEL_REGISTRY: { decision: {}, actionItem: {} },
  consolidateMemories: vi.fn(),
  getConsolidatedMemories: vi.fn(),
}));
vi.mock("../../models/auditLogModel.js");

describe("Consolidation Controller Org Validation (#1961)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validOrgId = new mongoose.Types.ObjectId().toString();

  const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("returns 400 when organization is missing in runConsolidation", async () => {
    const req = { body: {}, user: {} };
    const res = createMockRes();

    await runConsolidation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Organization ID is required and must be a valid ObjectId",
      }),
    );
  });

  it("returns 400 when organization is invalid format in getConsolidationHistory", async () => {
    const req = {
      query: { model: "decision" },
      user: { organization: "invalid-org" },
    };
    const res = createMockRes();

    await getConsolidationHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Organization ID is required and must be a valid ObjectId",
      }),
    );
  });

  it("successfully processes valid organization and returns consolidation report", async () => {
    consolidateMemories.mockResolvedValue({
      dryRun: true,
      totalClustersFound: 0,
      totalMerged: 0,
    });

    const req = {
      body: { models: ["decision"] },
      user: { organization: validOrgId },
    };
    const res = createMockRes();

    await runConsolidation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(consolidateMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: validOrgId,
      }),
    );
  });
});
