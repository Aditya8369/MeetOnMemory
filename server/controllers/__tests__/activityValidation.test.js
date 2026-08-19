import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { getActivities, getActivityStats } from "../activityController.js";
import * as activityService from "../../services/activityService.js";

vi.mock("../../services/activityService.js");

describe("Activity Controller Validation (#1853)", () => {
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

  it("returns 400 when organization ID is missing in getActivities", async () => {
    const req = { query: {}, user: {} };
    const res = createMockRes();

    await getActivities(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Valid organization ID is required.",
    });
  });

  it("returns 400 when organization ID is invalid format in getActivities", async () => {
    const req = { query: {}, user: { organization: "invalid-id" } };
    const res = createMockRes();

    await getActivities(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Valid organization ID is required.",
    });
  });

  it("returns 400 when organization ID is invalid in getActivityStats", async () => {
    const req = { user: { organization: "not-an-objectid" } };
    const res = createMockRes();

    await getActivityStats(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Valid organization ID is required.",
    });
  });

  it("successfully returns activities for valid organization", async () => {
    activityService.getOrgActivities.mockResolvedValue({
      activities: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    const req = {
      query: { page: "1", limit: "20" },
      user: { organization: validOrgId },
    };
    const res = createMockRes();

    await getActivities(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(activityService.getOrgActivities).toHaveBeenCalledWith(
      validOrgId,
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
  });
});
