import request from "supertest";
import mongoose from "mongoose";
import app from "../server";
import { connectDB, closeDB, clearDB } from "./setup";
import Meeting from "../models/meetingModel";
import AsyncMeeting from "../models/asyncMeetingModel";

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe("Async Meetings API", () => {
  let userMock = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test User",
    email: "test@example.com",
    clerkId: "user_test",
  };

  let meetingMock;

  beforeEach(async () => {
    meetingMock = await Meeting.create({
      title: "Test Meeting",
      date: new Date(),
      uploadedBy: userMock._id,
      participants: [
        { user: userMock._id, name: userMock.name, role: "organizer" },
      ],
    });
  });

  it("should create an async meeting", async () => {
    const res = await request(app)
      .post("/api/async-meetings")
      .set("clerk-id", userMock.clerkId)
      .send({
        originalMeetingId: meetingMock._id,
        title: "Test Async Update",
        template: ["What did you do?", "What's next?"],
        deadline: new Date(Date.now() + 86400000).toISOString(), // 1 day
        participants: [userMock._id.toString()],
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toEqual("Test Async Update");
    expect(res.body.status).toEqual("pending");
  });

  it("should fail to create with invalid data", async () => {
    const res = await request(app)
      .post("/api/async-meetings")
      .set("clerk-id", userMock.clerkId)
      .send({
        title: "Missing fields",
      });

    expect(res.statusCode).toEqual(400);
  });

  it("should fetch async meetings for user", async () => {
    await AsyncMeeting.create({
      originalMeetingId: meetingMock._id,
      title: "Test Async Update",
      creator: userMock._id,
      participants: [userMock._id],
      template: ["Update"],
      deadline: new Date(),
    });

    const res = await request(app)
      .get("/api/async-meetings")
      .set("clerk-id", userMock.clerkId);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toEqual(1);
  });
});
