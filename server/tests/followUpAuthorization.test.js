/**
 * Issue #1529 — Follow-Up endpoints remain behind userAuth and existing
 * organization / assignee / admin checks after route registration.
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";

let currentUser = null;

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = currentUser;
    next();
  },
}));

const findSpy = jest.fn();
const countDocumentsSpy = jest.fn();
const findByIdSpy = jest.fn();

jest.unstable_mockModule("../models/FollowUpTask.js", () => ({
  default: {
    find: (...args) => findSpy(...args),
    countDocuments: (...args) => countDocumentsSpy(...args),
    findById: (...args) => findByIdSpy(...args),
  },
}));

jest.unstable_mockModule("../services/followUpWorkflowService.js", () => ({
  getCompletionAnalytics: jest.fn().mockResolvedValue({
    totalTasks: 0,
    completedTasks: 0,
  }),
  updateTaskStatus: jest.fn(),
  processReminders: jest.fn().mockResolvedValue({ sent: 0 }),
}));

const { default: followUpRoutes } = await import("../routes/followUpRoutes.js");
const { getCompletionAnalytics } =
  await import("../services/followUpWorkflowService.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const TASK_ID = new mongoose.Types.ObjectId();

const alice = {
  _id: USER_A,
  organization: ORG_A,
  role: "member",
};

const admin = {
  _id: USER_A,
  organization: ORG_A,
  role: "admin",
};

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api/followup", followUpRoutes);
});

beforeEach(() => {
  currentUser = alice;
  findSpy.mockReset();
  countDocumentsSpy.mockReset();
  findByIdSpy.mockReset();
  getCompletionAnalytics.mockClear();

  findSpy.mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    select: jest.fn().mockReturnThis(),
  });
  countDocumentsSpy.mockResolvedValue(0);
});

describe("Follow-Up API auth after registration (#1529)", () => {
  it("rejects unauthenticated task list requests", async () => {
    currentUser = null;

    const res = await request(app).get("/api/followup/tasks");

    expect(res.status).toBe(401);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("lists tasks scoped to the authenticated user's organization", async () => {
    const res = await request(app).get("/api/followup/tasks");

    expect(res.status).toBe(200);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: ORG_A,
        assignee: USER_A,
      }),
    );
  });

  it("returns analytics for the caller's organization only", async () => {
    const res = await request(app).get("/api/followup/analytics");

    expect(res.status).toBe(200);
    expect(getCompletionAnalytics).toHaveBeenCalledWith(ORG_A, {});
  });

  it("rejects acknowledge when the caller is not the assignee", async () => {
    findByIdSpy.mockResolvedValue({
      _id: TASK_ID,
      assignee: new mongoose.Types.ObjectId(),
      organization: ORG_A,
      acknowledge: jest.fn(),
    });

    const res = await request(app).post(
      `/api/followup/tasks/${TASK_ID}/acknowledge`,
    );

    expect(res.status).toBe(403);
  });

  it("rejects cross-organization task read", async () => {
    const foreignTask = {
      _id: TASK_ID,
      organization: ORG_B,
      assignee: USER_A,
    };
    const chain = {
      populate: jest.fn().mockReturnThis(),
      then: (onFulfilled, onRejected) =>
        Promise.resolve(foreignTask).then(onFulfilled, onRejected),
      catch: (onRejected) => Promise.resolve(foreignTask).catch(onRejected),
    };
    findByIdSpy.mockReturnValue(chain);

    const res = await request(app).get(`/api/followup/tasks/${TASK_ID}`);

    expect(res.status).toBe(403);
  });

  it("rejects non-admin escalation", async () => {
    const res = await request(app)
      .post(`/api/followup/escalate/${TASK_ID}`)
      .send({ reason: "late" });

    expect(res.status).toBe(403);
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  it("allows admin escalation within auth boundary", async () => {
    currentUser = admin;
    findByIdSpy.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: TASK_ID,
        assignee: { name: "Bob" },
        escalate: jest.fn().mockResolvedValue(undefined),
      }),
    });

    const res = await request(app)
      .post(`/api/followup/escalate/${TASK_ID}`)
      .send({ reason: "overdue" });

    expect(res.status).toBe(200);
  });

  it("rejects unauthenticated analytics", async () => {
    currentUser = null;

    const res = await request(app).get("/api/followup/analytics");

    expect(res.status).toBe(401);
    expect(getCompletionAnalytics).not.toHaveBeenCalled();
  });
});
