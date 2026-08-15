import request from "supertest";
import { app } from "../server.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";
import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";
import NoteVersion from "../models/noteVersionModel.js";
import mongoose from "mongoose";
import * as Y from "yjs";

describe("Collaborative Notes REST API Integration Tests", () => {
  let token;
  let user;
  let organizationId;
  let meeting;

  beforeEach(async () => {
    organizationId = new mongoose.Types.ObjectId();

    user = await User.create({
      name: "Notes Test User",
      email: "notes_test@test.com",
      password: "password123",
      role: "member",
      organization: organizationId,
    });
    user.clerkUserId = `user_test_${user._id}`;
    await user.save();

    token = createClerkTestToken({
      clerkUserId: user.clerkUserId,
      email: user.email,
    });

    // Create a Yjs state update for initial content
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("notes");
    ydoc.transact(() => {
      ytext.insert(0, "Initial collaborative notes content");
    });
    const stateUpdate = Y.encodeStateAsUpdate(ydoc);

    meeting = await Meeting.create({
      title: "Notes Sync Meeting",
      date: new Date(),
      organization: organizationId,
      uploadedBy: user._id,
      participants: [{ user: user._id, name: "Notes Test User" }],
      crdtState: Buffer.from(stateUpdate),
      collaborativeNotes: "Initial collaborative notes content",
    });
  });

  describe("GET /api/notes/:meetingId", () => {
    it("should reject access with 401 if unauthorized", async () => {
      const res = await request(app).get(`/api/notes/${meeting._id}`);
      expect(res.statusCode).toBe(401);
    });

    it("should reject access with 403 if user is from different organization", async () => {
      const otherOrgToken = createClerkTestToken({
        clerkUserId: "user_other",
        email: "other@test.com",
      });
      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        password: "password123",
        role: "member",
        organization: new mongoose.Types.ObjectId(),
      });
      otherUser.clerkUserId = "user_other";
      await otherUser.save();

      const res = await request(app)
        .get(`/api/notes/${meeting._id}`)
        .set(authHeader(otherOrgToken));

      expect(res.statusCode).toBe(403);
    });

    it("should return the state vector and plainText of the collaborative note", async () => {
      const res = await request(app)
        .get(`/api/notes/${meeting._id}`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plainText).toBe(
        "Initial collaborative notes content",
      );
      expect(res.body.data.stateVector).toBeInstanceOf(Array);
    });
  });

  describe("POST /api/notes/:meetingId/snapshot", () => {
    it("should create a manual snapshot and store it in NoteVersion schema", async () => {
      const res = await request(app)
        .post(`/api/notes/${meeting._id}/snapshot`)
        .set(authHeader(token))
        .send({ title: "Custom manual note snapshot" });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(1); // snapshotNoteVersion starts at version 1
      expect(res.body.data.content).toBe("Initial collaborative notes content");

      // Verify NoteVersion document was actually created
      const storedVersion = await NoteVersion.findOne({
        meetingId: meeting._id,
        field: "collaborativeNotes",
        version: 1,
      });
      expect(storedVersion).toBeDefined();
      expect(storedVersion.content).toBe("Initial collaborative notes content");
      expect(storedVersion.changedBy.toString()).toBe(user._id.toString());
    });
  });

  describe("GET /api/notes/:meetingId/history", () => {
    it("should retrieve a list of snapshots formatted correctly", async () => {
      // Create a snapshot first
      await request(app)
        .post(`/api/notes/${meeting._id}/snapshot`)
        .set(authHeader(token))
        .send({ title: "First manual snapshot" });

      const res = await request(app)
        .get(`/api/notes/${meeting._id}/history`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].version).toBe(1);
      expect(res.body.data[0].title).toBe("User Edit");
      expect(res.body.data[0].createdBy.name).toBe("Notes Test User");
    });
  });

  describe("GET /api/notes/:meetingId/snapshot/:version", () => {
    it("should fetch snapshot content by version", async () => {
      // Create a snapshot first
      await request(app)
        .post(`/api/notes/${meeting._id}/snapshot`)
        .set(authHeader(token))
        .send({ title: "First manual snapshot" });

      const res = await request(app)
        .get(`/api/notes/${meeting._id}/snapshot/1`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.content).toBe("Initial collaborative notes content");
      expect(res.body.data.createdBy.name).toBe("Notes Test User");
    });

    it("should return 404 if snapshot version is not found", async () => {
      const res = await request(app)
        .get(`/api/notes/${meeting._id}/snapshot/999`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(404);
    });
  });
});
