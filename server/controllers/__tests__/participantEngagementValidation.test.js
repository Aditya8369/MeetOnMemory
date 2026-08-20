import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  getParticipantScorecard,
  getOrganizationRankings,
  recalculateScorecard,
} from "../participantEngagementController.js";
import ParticipantEngagement from "../../models/participantEngagementModel.js";
import ParticipantEngagementService from "../../services/participantEngagementService.js";

vi.mock("../../models/participantEngagementModel.js");
vi.mock("../../services/participantEngagementService.js");

describe("Participant Engagement Validation & Security (#1852)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validUserId = new mongoose.Types.ObjectId().toString();
  const validOrgId = new mongoose.Types.ObjectId().toString();

  const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("returns 400 if userId is not a valid ObjectId in getParticipantScorecard", async () => {
    const req = {
      params: { userId: "not-an-id" },
      user: { organization: validOrgId },
    };
    const res = createMockRes();

    await getParticipantScorecard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid user ID format",
      }),
    );
  });

  it("returns 400 if user has no valid organization in getOrganizationRankings", async () => {
    const req = {
      query: { page: 1, limit: 10 },
      user: { organization: "invalid-org" },
    };
    const res = createMockRes();

    await getOrganizationRankings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Organization ID is required and must be valid",
      }),
    );
  });

  it("clamps limit to 100 when oversized limit is requested", async () => {
    ParticipantEngagementService.getOrganizationRankings.mockResolvedValue({
      rankings: [],
      pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
    });

    const req = {
      query: { page: 1, limit: 500 },
      user: { organization: validOrgId },
    };
    const res = createMockRes();

    await getOrganizationRankings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(
      ParticipantEngagementService.getOrganizationRankings,
    ).toHaveBeenCalledWith(
      validOrgId,
      expect.objectContaining({
        page: 1,
        limit: 100,
      }),
    );
  });

  it("returns 400 if userId is not a valid ObjectId in recalculateScorecard", async () => {
    const req = {
      params: { userId: "bad-user-id" },
      user: { organization: validOrgId },
    };
    const res = createMockRes();

    await recalculateScorecard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid user ID format",
      }),
    );
  });

  it("allows valid requests and returns scorecard", async () => {
    ParticipantEngagement.findOne.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: { name: "John" },
        organizationId: validOrgId,
      }),
    });

    const req = {
      params: { userId: validUserId },
      user: { organization: validOrgId },
    };
    const res = createMockRes();

    await getParticipantScorecard(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
      }),
    );
  });
});
