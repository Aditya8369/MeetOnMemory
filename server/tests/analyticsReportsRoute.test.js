import express from "express";
import request from "supertest";

const mockUserAuth = jest.fn((req, res, next) => {
  if (req.headers.authorization !== "Bearer reports-test-token") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  req.user = {
    id: "reports-user-1",
    organization: "reports-org-1",
  };

  return next();
});

const mockGetAnalytics = jest.fn((req, res) =>
  res.status(200).json({
    success: true,
    summary: {
      totalMeetings: 4,
      completedMeetings: 3,
      totalPolicies: 2,
      updatedPolicies: 1,
    },
    trends: {
      monthlyMeetings: [],
      monthlyPolicies: [],
    },
  }),
);

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: mockUserAuth,
}));

jest.unstable_mockModule(
  "../controllers/meetingAnalyticsController.js",
  () => ({
    getMeetingAnalytics: jest.fn(),
    triggerAnalysis: jest.fn(),
    getOrganizationAnalyticsEndpoint: jest.fn(),
    getSpeakerBreakdown: jest.fn(),
    getTrends: jest.fn(),
    getAnalytics: mockGetAnalytics,
    getTeamAnalyticsSummary: jest.fn(),
    getTeamRecentMeetings: jest.fn(),
  }),
);

const { default: analyticsRoutes } =
  await import("../routes/analyticsRoutes.js");

describe("Reports analytics endpoint registration (Issue #1533)", () => {
  const app = express();

  beforeAll(() => {
    app.use(express.json());
    app.use("/api/analytics", analyticsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers GET /api/analytics and returns the Reports response contract", async () => {
    const response = await request(app)
      .get("/api/analytics")
      .set("Authorization", "Bearer reports-test-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      summary: {
        totalMeetings: 4,
        completedMeetings: 3,
        totalPolicies: 2,
        updatedPolicies: 1,
      },
      trends: {
        monthlyMeetings: [],
        monthlyPolicies: [],
      },
    });

    expect(mockGetAnalytics).toHaveBeenCalledTimes(1);
  });

  it("does not expose the Reports endpoint without authentication", async () => {
    const response = await request(app).get("/api/analytics");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Unauthorized",
    });
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it("keeps the existing meeting analytics endpoints registered", async () => {
    expect(
      analyticsRoutes.stack.some(
        (layer) =>
          layer.route?.path === "/meetings/:meetingId" &&
          layer.route.methods.get,
      ),
    ).toBe(true);

    expect(
      analyticsRoutes.stack.some(
        (layer) =>
          layer.route?.path === "/speakers/:meetingId" &&
          layer.route.methods.get,
      ),
    ).toBe(true);

    expect(
      analyticsRoutes.stack.some(
        (layer) =>
          layer.route?.path === "/organization/:orgId" &&
          layer.route.methods.get,
      ),
    ).toBe(true);
  });
});
