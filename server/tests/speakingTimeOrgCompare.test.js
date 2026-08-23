import request from "supertest";
import mongoose from "mongoose";
import { vi, describe, beforeAll, beforeEach, it, expect } from "vitest";

const { default: express } = await import("express");
const { default: speakingTimeRoutes } =
  await import("../routes/speakingTimeRoutes.js");

// We mock speakingTimeService.js to verify route and controller parameters and mapping
const mockStatsResult = {
  avgTalkRatio: 35.5,
  medianTalkRatio: 33.2,
  topSpeakers: [
    { identifier: "user-1", speakerName: "Alice", totalDuration: 500 },
  ],
  meetingCount: 2,
  memberStats: [
    {
      identifier: "user-1",
      speakerName: "Alice",
      totalDuration: 500,
      averageTalkRatio: 35.5,
      meetingCount: 2,
    },
  ],
};

const mockGetOrgSpeakingTimeStats = vi.fn().mockResolvedValue(mockStatsResult);

vi.mock("../services/speakingTimeService.js", () => ({
  getOrgSpeakingTimeStats: (...args) => mockGetOrgSpeakingTimeStats(...args),
  getBreakdownForMeeting: vi.fn(),
  getTrendsForUser: vi.fn(),
}));

describe("Speaking Time Org Compare Routing & RBAC Tests (#2038)", () => {
  let app;
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  let mockUser = {
    _id: mockUserId,
    organization: mockOrgId,
    role: "admin",
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Inject user authentication stub
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
    app.use("/api/speaking-time", speakingTimeRoutes);
  });

  beforeEach(() => {
    mockGetOrgSpeakingTimeStats.mockClear();
    mockUser = {
      _id: mockUserId,
      organization: mockOrgId,
      role: "admin",
    };
  });

  it("allows authorized roles (admin) and passes parameters to service", async () => {
    const res = await request(app)
      .get("/api/speaking-time/org-compare")
      .query({ startDate: "2026-08-01", endDate: "2026-08-15" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockStatsResult);
    expect(mockGetOrgSpeakingTimeStats).toHaveBeenCalledWith(
      mockOrgId.toString(),
      "2026-08-01",
      "2026-08-15",
    );
  });

  it("blocks unauthorized roles (viewer) with 403 Forbidden", async () => {
    mockUser.role = "viewer";

    const res = await request(app).get("/api/speaking-time/org-compare");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("permission");
    expect(mockGetOrgSpeakingTimeStats).not.toHaveBeenCalled();
  });

  it("returns 400 Bad Request if user has no organization context", async () => {
    mockUser.organization = null;

    const res = await request(app).get("/api/speaking-time/org-compare");
    expect(res.status).toBe(400);
  });
});
