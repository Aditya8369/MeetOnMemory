import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrganizationQualityEndpoint } from "../controllers/meetingQualityController.js";
import meetingQualityRoutes from "../routes/meetingQualityRoutes.js";

vi.mock("../services/recapEmailService.js", () => ({
  default: vi.fn(),
}));

vi.mock("../services/meetingQualityService.js", () => ({
  getOrganizationQuality: vi.fn().mockResolvedValue({ score: 85 }),
}));

describe("Meeting Quality Wiring and Authorization (#1394)", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { orgId: "507f1f77bcf86cd799439011" },
      query: {},
      user: { organization: "507f1f77bcf86cd799439011" },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("exports meetingQualityRoutes router correctly", () => {
    expect(meetingQualityRoutes).toBeDefined();
    expect(typeof meetingQualityRoutes).toBe("function");
  });

  it("allows retrieval of organization quality metrics for matching organization", async () => {
    await getOrganizationQualityEndpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ score: 85 });
  });

  it("rejects cross-organization quality metrics requests with 403 status", async () => {
    req.user.organization = "507f1f77bcf86cd799439099";

    await getOrganizationQualityEndpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Forbidden: Not part of organization",
      }),
    );
  });
});
