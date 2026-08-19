/**
 * Issue #1531 — Collaborative Notes REST module: route mount + authorization
 * via resolveAccessibleMeeting before any CRDT / NoteVersion access.
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
const noteVersionFindSpy = jest.fn();
const noteVersionFindOneSpy = jest.fn();
const getStateVectorSpy = jest.fn();
const createSnapshotSpy = jest.fn();

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: {
    findById: (...args) => findByIdSpy(...args),
  },
}));

jest.unstable_mockModule("../models/noteVersionModel.js", () => ({
  default: {
    find: (...args) => noteVersionFindSpy(...args),
    findOne: (...args) => noteVersionFindOneSpy(...args),
  },
}));

jest.unstable_mockModule("../services/crdtService.js", () => ({
  default: {
    getStateVector: (...args) => getStateVectorSpy(...args),
    createSnapshot: (...args) => createSnapshotSpy(...args),
  },
}));

const { default: notesRoutes } = await import("../routes/notes.routes.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const MEETING_A = new mongoose.Types.ObjectId();
const OWNER_ID = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

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

const meetingDoc = (overrides = {}) => ({
  _id: MEETING_A,
  title: "Notes Meeting",
  organization: ORG_A,
  uploadedBy: OWNER_ID,
  collaborativeNotes: "shared notes body",
  updatedAt: new Date("2026-01-01"),
  participants: [],
  ...overrides,
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/notes", notesRoutes);
  return app;
}

describe("Collaborative Notes REST authorization (#1531)", () => {
  beforeEach(() => {
    currentUser = null;
    findByIdSpy.mockReset();
    noteVersionFindSpy.mockReset();
    noteVersionFindOneSpy.mockReset();
    getStateVectorSpy.mockReset();
    createSnapshotSpy.mockReset();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(buildApp()).get(`/api/notes/${MEETING_A}`);
    expect(res.status).toBe(401);
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid meeting IDs before DB lookup of notes", async () => {
    currentUser = alice;
    const res = await request(buildApp()).get("/api/notes/not-valid");
    expect(res.status).toBe(400);
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(getStateVectorSpy).not.toHaveBeenCalled();
  });

  it("allows same-org members and scopes CRDT reads to the authorized meeting id", async () => {
    currentUser = alice;
    findByIdSpy.mockResolvedValue(meetingDoc());
    getStateVectorSpy.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const res = await request(buildApp()).get(`/api/notes/${MEETING_A}`);

    expect(res.status).toBe(200);
    expect(res.body.data.plainText).toBe("shared notes body");
    expect(getStateVectorSpy).toHaveBeenCalledWith(MEETING_A);
  });

  it("rejects cross-organization access before snapshot reads", async () => {
    currentUser = mallory;
    findByIdSpy.mockResolvedValue(meetingDoc());

    const res = await request(buildApp()).get(
      `/api/notes/${MEETING_A}/snapshot/1`,
    );

    expect(res.status).toBe(403);
    expect(noteVersionFindOneSpy).not.toHaveBeenCalled();
  });

  it("rejects cross-organization snapshot creation before CrdtService runs", async () => {
    currentUser = mallory;
    findByIdSpy.mockResolvedValue(meetingDoc());

    const res = await request(buildApp())
      .post(`/api/notes/${MEETING_A}/snapshot`)
      .send({ title: "Nope" });

    expect(res.status).toBe(403);
    expect(createSnapshotSpy).not.toHaveBeenCalled();
  });

  it("allows the meeting owner to create a snapshot", async () => {
    currentUser = { ...alice, _id: OWNER_ID };
    findByIdSpy.mockResolvedValue(meetingDoc({ uploadedBy: OWNER_ID }));
    createSnapshotSpy.mockResolvedValue({
      version: 2,
      content: "shared notes body",
    });

    const res = await request(buildApp())
      .post(`/api/notes/${MEETING_A}/snapshot`)
      .send({ title: "Manual" });

    expect(res.status).toBe(201);
    expect(createSnapshotSpy).toHaveBeenCalledWith(
      MEETING_A,
      OWNER_ID,
      "Manual",
    );
  });
});

describe("Collaborative Notes router surface (#1531)", () => {
  it("exposes snapshot and history endpoints on the notes router", () => {
    const paths = (notesRoutes.stack || [])
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/:meetingId",
          methods: expect.arrayContaining(["get"]),
        }),
        expect.objectContaining({
          path: "/:meetingId/history",
          methods: expect.arrayContaining(["get"]),
        }),
        expect.objectContaining({
          path: "/:meetingId/snapshot",
          methods: expect.arrayContaining(["post"]),
        }),
        expect.objectContaining({
          path: "/:meetingId/snapshot/:version",
          methods: expect.arrayContaining(["get"]),
        }),
      ]),
    );
  });
});
