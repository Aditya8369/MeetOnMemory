import { createCsrfAgent } from "./helpers/csrfHelper.js";
import PersonalNote from "../models/personalNoteModel.js";
import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";
import jwt from "jsonwebtoken";

describe("PersonalNote API", () => {
  let token;
  let user;
  let meeting;
  let agent;
  let csrfToken;

  beforeEach(async () => {
    // Create test user
    user = await User.create({
      name: "Test Note User",
      email: "noteuser@test.com",
      password: "password123",
      role: "member",
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create test meeting
    meeting = await Meeting.create({
      title: "Test Note Meeting",
      date: new Date(),
      uploadedBy: user._id,
      participants: [{ name: "Test User" }],
    });

    // Initialize agent with CSRF
    ({ agent, csrfToken } = await createCsrfAgent());
  });

  it("should create a new personal note", async () => {
    const res = await agent
      .post(`/api/personal-notes/${meeting._id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-CSRF-Token", csrfToken)
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

    const res = await agent
      .post(`/api/personal-notes/${meeting._id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ content: "Updated content" });
    if (res.statusCode === 404)
      console.log("404 Error Body:", res.body, res.text);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.note.content).toBe("Updated content");
  });

  it("should add an annotation", async () => {
    const res = await agent
      .post(`/api/personal-notes/${meeting._id}/annotations`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-CSRF-Token", csrfToken)
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
    const res = await agent
      .patch(`/api/personal-notes/${meeting._id}/pin`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-CSRF-Token", csrfToken)
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

    const res = await agent
      .get(`/api/personal-notes/pinned`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].isPinned).toBe(true);
  });

  it("should search notes", async () => {
    await PersonalNote.create({
      userId: user._id,
      meetingId: meeting._id,
      content: "Find this specific word",
    });

    // Wait for text index to build if necessary, though in memory or local test db might be instant
    await new Promise((resolve) => setTimeout(resolve, 500));

    const res = await agent
      .get(`/api/personal-notes/search?q=specific`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notes.length).toBeGreaterThanOrEqual(1);
  });
});
