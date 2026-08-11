import request from "supertest";
import { app } from "../server.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";
import PersonalNote from "../models/personalNoteModel.js";
import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";
import mongoose from "mongoose";

describe("PersonalNote API", () => {
  let token;
  let user;
  let meeting;

  beforeEach(async () => {
    user = await User.create({
      name: "Test Note User",
      email: "noteuser@test.com",
      password: "password123",
      role: "member",
    });
    user.clerkUserId = `user_test_${user._id}`;
    await user.save();

    token = createClerkTestToken({
      clerkUserId: user.clerkUserId,
      email: user.email,
    });

    meeting = await Meeting.create({
      title: "Test Note Meeting",
      date: new Date(),
      uploadedBy: user._id,
      participants: [{ name: "Test User" }],
    });
  });

  it("should create a new personal note", async () => {
    const res = await request(app)
      .post(`/api/personal-notes/${meeting._id}`)
      .set(authHeader(token))
      .send({ content: "This is a private note." });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.note.content).toBe("This is a private note.");
  });

  it("should update an existing personal note", async () => {
    await PersonalNote.create({
      userId: user._id,
      meetingId: meeting._id,
      content: "Initial content",
    });

    const res = await request(app)
      .post(`/api/personal-notes/${meeting._id}`)
      .set(authHeader(token))
      .send({ content: "Updated content" });
    if (res.statusCode === 404)
      console.log("404 Error Body:", res.body, res.text);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.note.content).toBe("Updated content");
  });

  it("should add an annotation", async () => {
    const res = await request(app)
      .post(`/api/personal-notes/${meeting._id}/annotations`)
      .set(authHeader(token))
      .send({
        annotationText: "Important highlight",
        sourceField: "transcript",
        offsets: { start: 10, end: 30 },
        color: "#ff0000",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.note.annotations).toHaveLength(1);
    expect(res.body.note.annotations[0].annotationText).toBe(
      "Important highlight",
    );
  });

  it("should pin a note", async () => {
    const res = await request(app)
      .patch(`/api/personal-notes/${meeting._id}/pin`)
      .set(authHeader(token))
      .send({ isPinned: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.note.isPinned).toBe(true);
  });

  it("should fetch pinned notes", async () => {
    await PersonalNote.create({
      userId: user._id,
      meetingId: meeting._id,
      content: "Pinned note",
      isPinned: true,
    });

    const res = await request(app)
      .get(`/api/personal-notes/pinned`)
      .set(authHeader(token));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].isPinned).toBe(true);
  });

  it("rejects a non-ObjectId meetingId with 400 instead of 500", async () => {
    const res = await request(app)
      .post(`/api/personal-notes/not-an-object-id`)
      .set(authHeader(token))
      .send({ content: "x" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for a meeting that does not exist", async () => {
    const missingId = "5f9f1b9b9c9d440000000000";
    const res = await request(app)
      .post(`/api/personal-notes/${missingId}`)
      .set(authHeader(token))
      .send({ content: "x" });

    expect(res.statusCode).toBe(404);
  });

  it("returns 403 for a meeting the user cannot access", async () => {
    const otherUser = await User.create({
      name: "Other Org User",
      email: "otherorg@test.com",
      password: "password123",
      role: "member",
    });
    const foreignMeeting = await Meeting.create({
      title: "Foreign Meeting",
      date: new Date(),
      uploadedBy: otherUser._id,
      participants: [],
    });

    const res = await request(app)
      .post(`/api/personal-notes/${foreignMeeting._id}`)
      .set(authHeader(token))
      .send({ content: "trying to attach to a foreign meeting" });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("rejects content over the max length with 400", async () => {
    const res = await request(app)
      .post(`/api/personal-notes/${meeting._id}`)
      .set(authHeader(token))
      .send({ content: "a".repeat(50001) });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should search notes", async () => {
    await PersonalNote.create({
      userId: user._id,
      meetingId: meeting._id,
      content: "Find this specific word",
    });

    // Wait for text index to build if necessary, though in memory or local test db might be instant
    await new Promise((resolve) => setTimeout(resolve, 500));

    const res = await request(app)
      .get(`/api/personal-notes/search?q=specific`)
      .set(authHeader(token));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notes.length).toBeGreaterThanOrEqual(1);
  });

  it("should prevent User B from accessing User A's note for the same accessible meeting", async () => {
    const orgId = new mongoose.Types.ObjectId();
    // Update User A's organization
    user.organization = orgId;
    await user.save();

    // Update Meeting's organization
    meeting.organization = orgId;
    await meeting.save();

    // Create User B in the same organization
    const userB = await User.create({
      name: "User B",
      email: "userb@test.com",
      password: "password123",
      role: "member",
      organization: orgId,
    });
    userB.clerkUserId = `user_test_${userB._id}`;
    await userB.save();

    const tokenB = createClerkTestToken({
      clerkUserId: userB.clerkUserId,
      email: userB.email,
    });

    // Create User A's note
    await PersonalNote.create({
      userId: user._id,
      meetingId: meeting._id,
      content: "User A private thoughts",
    });

    // User B tries to read the note for the meeting
    // User B should get an empty note (success: true, content: ""), NOT User A's note!
    const resGet = await request(app)
      .get(`/api/personal-notes/${meeting._id}`)
      .set(authHeader(tokenB));

    expect(resGet.statusCode).toBe(200);
    expect(resGet.body.success).toBe(true);
    expect(resGet.body.note.content).toBe(""); // should be empty, not User A's note

    // User B tries to upsert the note
    // It should create a new note for User B, leaving User A's note untouched
    const resPost = await request(app)
      .post(`/api/personal-notes/${meeting._id}`)
      .set(authHeader(tokenB))
      .send({ content: "User B note content" });

    expect(resPost.statusCode).toBe(200);
    expect(resPost.body.success).toBe(true);
    expect(resPost.body.note.content).toBe("User B note content");

    // Verify User A's note is unchanged in db
    const noteA = await PersonalNote.findOne({
      userId: user._id,
      meetingId: meeting._id,
    });
    expect(noteA.content).toBe("User A private thoughts");
  });

  it("should filter out notes for inaccessible meetings from search and pinned endpoints", async () => {
    // Create User B
    const userB = await User.create({
      name: "User B",
      email: "userb@test.com",
      password: "password123",
      role: "member",
    });
    userB.clerkUserId = `user_test_${userB._id}`;
    await userB.save();

    const tokenB = createClerkTestToken({
      clerkUserId: userB.clerkUserId,
      email: userB.email,
    });

    // Create a foreign meeting that User B has NO access to
    const foreignMeeting = await Meeting.create({
      title: "Foreign Meeting",
      date: new Date(),
      uploadedBy: user._id, // User A uploaded it
      participants: [],
    });

    // Create a note for that meeting belonging to User B (e.g. from prior access)
    await PersonalNote.create({
      userId: userB._id,
      meetingId: foreignMeeting._id,
      content: "Secret content of User B",
      isPinned: true,
    });

    // User B fetches pinned notes - should be 0 because the meeting is inaccessible
    const resPinned = await request(app)
      .get(`/api/personal-notes/pinned`)
      .set(authHeader(tokenB));

    expect(resPinned.statusCode).toBe(200);
    expect(resPinned.body.notes).toHaveLength(0);

    // User B searches notes - should find 0 notes
    const resSearch = await request(app)
      .get(`/api/personal-notes/search?query=Secret`)
      .set(authHeader(tokenB));

    expect(resSearch.statusCode).toBe(200);
    expect(resSearch.body.notes).toHaveLength(0);
  });

  it("should deny modify/pin/annotation operations for users with guest role", async () => {
    // Create a guest user
    const guestUser = await User.create({
      name: "Guest User",
      email: "guest@test.com",
      password: "password123",
      role: "guest",
    });
    guestUser.clerkUserId = `user_test_${guestUser._id}`;
    await guestUser.save();

    const guestToken = createClerkTestToken({
      clerkUserId: guestUser.clerkUserId,
      email: guestUser.email,
    });

    // Try to create/upsert a note
    const resPost = await request(app)
      .post(`/api/personal-notes/${meeting._id}`)
      .set(authHeader(guestToken))
      .send({ content: "Guest note" });

    expect(resPost.statusCode).toBe(403);
    expect(resPost.body.success).toBe(false);

    // Try to pin a note
    const resPin = await request(app)
      .patch(`/api/personal-notes/${meeting._id}/pin`)
      .set(authHeader(guestToken))
      .send({ isPinned: true });

    expect(resPin.statusCode).toBe(403);
    expect(resPin.body.success).toBe(false);

    // Try to add annotation
    const resAnn = await request(app)
      .post(`/api/personal-notes/${meeting._id}/annotations`)
      .set(authHeader(guestToken))
      .send({
        annotationText: "Guest highlight",
        sourceField: "transcript",
        offsets: { start: 10, end: 30 },
        color: "#ff0000",
      });

    expect(resAnn.statusCode).toBe(403);
    expect(resAnn.body.success).toBe(false);
  });
});
