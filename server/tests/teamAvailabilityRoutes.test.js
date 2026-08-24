import request from "supertest";
import { app } from "../server.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";
import teamAvailabilityService from "../services/teamAvailabilityService.js";

// Mock the services to avoid heavy dependencies
vi.mock("../services/teamAvailabilityService.js", () => ({
  default: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    buildTeamHeatmap: vi.fn(),
    findCommonFreeSlots: vi.fn(),
    getLoadDistribution: vi.fn(),
  },
}));

describe("Team Availability API Routes (/api/team-availability) (#2276)", () => {
  let owner;
  let organization;
  let headers;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clean up models to prevent duplicate key or validation crashes
    await Promise.all([
      User.deleteMany({ email: /avail-test/ }),
      Organization.deleteMany({ name: "Avail Org" }),
    ]);

    owner = await User.create({
      name: "Availability Admin",
      email: `avail-test-${Date.now()}@example.com`,
      password: "Password123!",
      role: "owner",
      clerkUserId: `user_avail_${Date.now()}`,
    });

    organization = await Organization.create({
      name: "Avail Org",
      slug: `avail-org-${Date.now()}`,
      owner: owner._id,
    });

    owner.organization = organization._id;
    await owner.save();

    headers = authHeader(
      createClerkTestToken({
        clerkUserId: owner.clerkUserId,
        email: owner.email,
      }),
    );
  });

  it("GET /api/team-availability/heatmap calls buildTeamHeatmap and returns data", async () => {
    teamAvailabilityService.buildTeamHeatmap.mockResolvedValue([
      { date: "2026-08-24", hours: [] },
    ]);

    const res = await request(app)
      .get(
        "/api/team-availability/heatmap?startDate=2026-08-24&endDate=2026-08-24",
      )
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(teamAvailabilityService.buildTeamHeatmap).toHaveBeenCalled();
  });

  it("POST /api/team-availability/free-slots calls findCommonFreeSlots and returns slots", async () => {
    teamAvailabilityService.findCommonFreeSlots.mockResolvedValue([
      { start: "2026-08-24T09:00:00Z", end: "2026-08-24T10:00:00Z" },
    ]);

    const res = await request(app)
      .post("/api/team-availability/free-slots")
      .set(headers)
      .send({
        userIds: [owner._id.toString()],
        durationMinutes: 60,
        startDate: "2026-08-24",
        endDate: "2026-08-24",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(teamAvailabilityService.findCommonFreeSlots).toHaveBeenCalled();
  });
});
