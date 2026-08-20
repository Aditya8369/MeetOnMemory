/**
 * Issue #1403 — Meeting comparison must authorize EVERY meeting independently
 * via resolveAccessibleMeeting / canAccessMeetingDoc before ComparisonService runs.
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";

let currentUser = null;

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = currentUser;
    next();
  },
}));

const findByIdSpy = jest.fn();
const findSpy = jest.fn();

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: {
    findById: (...args) => findByIdSpy(...args),
    find: (...args) => findSpy(...args),
  },
}));

const computeItemDiffSpy = jest.fn(() => ({
  resolved: [],
  added: [],
  carriedOver: [],
}));
const generateAiDiffSummarySpy = jest.fn(async () => "ai summary");

jest.unstable_mockModule("../services/ComparisonService.js", () => ({
  default: {
    computeItemDiff: (...args) => computeItemDiffSpy(...args),
    generateAiDiffSummary: (...args) => generateAiDiffSummarySpy(...args),
  },
}));

const { default: comparisonRoutes } =
  await import("../routes/comparisonRoutes.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const MEETING_A = new mongoose.Types.ObjectId();
const MEETING_B = new mongoose.Types.ObjectId();
const MEETING_C = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const OWNER_ID = new mongoose.Types.ObjectId();

const alice = {
  _id: USER_A,
  organization: ORG_A,
  role: "member",
};

const mallory = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_B,
  role: "admin",
};

const noRoleUser = {
  _id: USER_A,
  organization: ORG_A,
  role: undefined,
};

const meetingDoc = (overrides = {}) => ({
  _id: MEETING_A,
  title: "Meeting A",
  date: new Date("2026-01-01"),
  summary: "Summary A",
  uploadedBy: OWNER_ID,
  organization: ORG_A,
  structuredMoM: {
    action_items: [{ task: "Do A", owner: "Alice" }],
    decisions: ["Decide A"],
  },
  ...overrides,
});

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api/comparison", comparisonRoutes);
});

beforeEach(() => {
  currentUser = alice;
  findByIdSpy.mockReset();
  findSpy.mockReset();
  computeItemDiffSpy.mockClear();
  generateAiDiffSummarySpy.mockClear();
});

describe("POST /api/comparison/compare authorization (#1403)", () => {
  it("compares two meetings the user can access (same org)", async () => {
    findByIdSpy
      .mockResolvedValueOnce(
        meetingDoc({
          _id: MEETING_A,
          title: "Alpha",
          summary: "Sum A",
        }),
      )
      .mockResolvedValueOnce(
        meetingDoc({
          _id: MEETING_B,
          title: "Beta",
          summary: "Sum B",
          structuredMoM: {
            action_items: [{ task: "Do B", owner: "Bob" }],
            decisions: ["Decide B"],
          },
        }),
      );

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(200);
    expect(res.body.meetingA.title).toBe("Alpha");
    expect(res.body.meetingB.title).toBe("Beta");
    expect(computeItemDiffSpy).toHaveBeenCalledTimes(2);
    expect(generateAiDiffSummarySpy).toHaveBeenCalledTimes(1);
  });

  it("allows the meeting owner even across organizations", async () => {
    currentUser = { _id: OWNER_ID, organization: ORG_B, role: "member" };
    findByIdSpy
      .mockResolvedValueOnce(
        meetingDoc({
          _id: MEETING_A,
          uploadedBy: OWNER_ID,
          organization: ORG_A,
        }),
      )
      .mockResolvedValueOnce(
        meetingDoc({
          _id: MEETING_B,
          uploadedBy: OWNER_ID,
          organization: ORG_A,
          title: "Second",
        }),
      );

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(200);
    expect(generateAiDiffSummarySpy).toHaveBeenCalled();
  });

  it("rejects unauthenticated requests before comparison", async () => {
    currentUser = null;

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(401);
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
  });

  it("rejects callers without meetings:view permission", async () => {
    currentUser = noRoleUser;

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(403);
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
  });

  it("rejects missing meeting ids", async () => {
    const res = await request(app).post("/api/comparison/compare").send({});

    expect(res.status).toBe(400);
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid meeting id format", async () => {
    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: "not-an-id",
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(400);
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
  });

  it("rejects when either meeting is missing", async () => {
    findByIdSpy.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(404);
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
  });

  it("denies an inaccessible meeting and never runs comparison", async () => {
    findByIdSpy.mockResolvedValueOnce(
      meetingDoc({
        _id: MEETING_A,
        organization: ORG_B,
        uploadedBy: OWNER_ID,
        title: "Secret Foreign Meeting",
        summary: "should not leak",
      }),
    );

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access/i);
    expect(res.body).not.toHaveProperty("meetingA");
    expect(JSON.stringify(res.body)).not.toContain("Secret Foreign Meeting");
    expect(JSON.stringify(res.body)).not.toContain("should not leak");
    expect(computeItemDiffSpy).not.toHaveBeenCalled();
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
  });

  it("rejects mixed authorized + unauthorized meetings as a whole", async () => {
    findByIdSpy
      .mockResolvedValueOnce(
        meetingDoc({
          _id: MEETING_A,
          organization: ORG_A,
          title: "Allowed",
        }),
      )
      .mockResolvedValueOnce(
        meetingDoc({
          _id: MEETING_B,
          organization: ORG_B,
          uploadedBy: OWNER_ID,
          title: "Forbidden Org B",
          summary: "cross-org secret",
        }),
      );

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
    });

    expect(res.status).toBe(403);
    expect(computeItemDiffSpy).not.toHaveBeenCalled();
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain("Forbidden Org B");
    expect(JSON.stringify(res.body)).not.toContain("cross-org secret");
  });

  it("denies Organization B admin comparing Organization A meetings", async () => {
    currentUser = mallory;
    findByIdSpy.mockResolvedValueOnce(
      meetingDoc({
        _id: MEETING_A,
        organization: ORG_A,
        uploadedBy: OWNER_ID,
      }),
    );

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
      organizationId: ORG_A.toString(), // client spoof must not bypass
    });

    expect(res.status).toBe(403);
    expect(generateAiDiffSummarySpy).not.toHaveBeenCalled();
  });

  it("ignores client-supplied organization identifiers", async () => {
    findByIdSpy
      .mockResolvedValueOnce(
        meetingDoc({ _id: MEETING_A, organization: ORG_A }),
      )
      .mockResolvedValueOnce(
        meetingDoc({ _id: MEETING_B, organization: ORG_A, title: "B" }),
      );

    const res = await request(app).post("/api/comparison/compare").send({
      meetingIdA: MEETING_A.toString(),
      meetingIdB: MEETING_B.toString(),
      organizationId: ORG_B.toString(),
      organization: ORG_B.toString(),
    });

    expect(res.status).toBe(200);
    // Still authorized via membership org A, not the spoofed org B.
    expect(generateAiDiffSummarySpy).toHaveBeenCalled();
  });
});

describe("GET /api/comparison/comparable/:meetingId authorization (#1403)", () => {
  it("returns comparable meetings only after base meeting is authorized", async () => {
    findByIdSpy.mockResolvedValue(
      meetingDoc({ _id: MEETING_A, organization: ORG_A }),
    );
    findSpy.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([
            meetingDoc({
              _id: MEETING_B,
              title: "Peer",
              organization: ORG_A,
              uploadedBy: OWNER_ID,
            }),
            meetingDoc({
              _id: MEETING_C,
              title: "Should filter",
              organization: ORG_B,
              uploadedBy: OWNER_ID,
            }),
          ]),
        }),
      }),
    });

    const res = await request(app).get(
      `/api/comparison/comparable/${MEETING_A}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Peer");
    expect(res.body.find((m) => m.title === "Should filter")).toBeUndefined();
  });

  it("denies comparable list for an unauthorized base meeting", async () => {
    findByIdSpy.mockResolvedValue(
      meetingDoc({
        _id: MEETING_A,
        organization: ORG_B,
        uploadedBy: OWNER_ID,
      }),
    );

    const res = await request(app).get(
      `/api/comparison/comparable/${MEETING_A}`,
    );

    expect(res.status).toBe(403);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated comparable requests", async () => {
    currentUser = null;

    const res = await request(app).get(
      `/api/comparison/comparable/${MEETING_A}`,
    );

    expect(res.status).toBe(401);
    expect(findByIdSpy).not.toHaveBeenCalled();
  });
});
