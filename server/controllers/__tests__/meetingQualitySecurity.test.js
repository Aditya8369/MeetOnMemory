import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  calculateScore,
  getOrganizationQualityEndpoint,
  getRecommendations,
} from "../meetingQualityController.js";
import Meeting from "../../models/meetingModel.js";
import { calculateMeetingQuality } from "../../services/meetingQualityService.js";

vi.mock("../../models/meetingModel.js");
vi.mock("../../services/meetingQualityService.js");
vi.mock("../../services/recommendationEngine.js");

describe("Meeting Quality Security & Safe Org ID Handling (#1959)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validMeetingId = new mongoose.Types.ObjectId().toString();
  const validOrgId = new mongoose.Types.ObjectId().toString();
  const foreignOrgId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId();

  const user = {
    _id: userId,
    organization: validOrgId,
  };

  const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("handles unset user organization safely without TypeError crash in getOrganizationQualityEndpoint", async () => {
    const req = {
      params: { orgId: validOrgId },
      query: { period: "monthly" },
      user: { _id: userId }, // organization is undefined
    };
    const res = createMockRes();

    await getOrganizationQualityEndpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: Not part of organization",
    });
  });

  it("allows meeting uploader to trigger calculateScore even if org matching is different", async () => {
    Meeting.findById.mockResolvedValue({
      _id: validMeetingId,
      uploadedBy: userId,
      organization: foreignOrgId,
    });
    calculateMeetingQuality.mockResolvedValue({});

    const req = {
      params: { meetingId: validMeetingId },
      user,
    };
    const res = createMockRes();

    await calculateScore(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Quality calculation started",
      }),
    );
  });

  it("rejects calculateScore with 403 when user does not have meeting access", async () => {
    Meeting.findById.mockResolvedValue({
      _id: validMeetingId,
      uploadedBy: new mongoose.Types.ObjectId(),
      organization: foreignOrgId,
    });

    const req = {
      params: { meetingId: validMeetingId },
      user,
    };
    const res = createMockRes();

    await calculateScore(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: Not part of organization",
    });
  });

  it("safely rejects getRecommendations when user lacks organization", async () => {
    const req = {
      params: { userId: userId.toString() },
      user: { _id: userId, role: "member" }, // no org
    };
    const res = createMockRes();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Organization required",
    });
  });
});
