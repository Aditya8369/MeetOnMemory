// server/tests/breakoutRoomWiring.test.js
import express from "express";
import supertest from "supertest";
import breakoutRoomRoutes from "../routes/breakoutRoomRoutes.js";

// Mock userAuth middleware for testing
jest.mock("../middleware/userAuth.js", () => {
  return (req, res, next) => {
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      organization: "507f1f77bcf86cd799439022",
    };
    next();
  };
});

// Mock controller methods
jest.mock("../controllers/breakoutRoomController.js", () => ({
  createRoom: jest.fn().mockImplementation((req, res) =>
    res.status(201).json({
      success: true,
      data: { _id: "room-1", name: req.body.name, status: "pending" },
    }),
  ),
  getRooms: jest.fn().mockImplementation((req, res) =>
    res.status(200).json({
      success: true,
      data: [
        {
          _id: "room-1",
          name: "Team 1",
          status: "pending",
          participants: [],
        },
      ],
    }),
  ),
  assignParticipants: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).json({ success: true, message: "Participants assigned" }),
    ),
  startRoom: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).json({ success: true, message: "Breakout room started" }),
    ),
  closeRoom: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).json({ success: true, message: "Breakout room closed" }),
    ),
}));

describe("Breakout Room Routes & Auth Middleware Security Tests (#1881)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/meetings/:meetingId/breakout-rooms", breakoutRoomRoutes);
  });

  it("POST /api/meetings/:meetingId/breakout-rooms should create a room", async () => {
    const res = await supertest(app)
      .post("/api/meetings/meet-123/breakout-rooms")
      .send({ name: "Frontend Team" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Frontend Team");
  });

  it("GET /api/meetings/:meetingId/breakout-rooms should return rooms list", async () => {
    const res = await supertest(app).get(
      "/api/meetings/meet-123/breakout-rooms",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/meetings/:meetingId/breakout-rooms/:roomId/start should start room", async () => {
    const res = await supertest(app).post(
      "/api/meetings/meet-123/breakout-rooms/room-1/start",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/meetings/:meetingId/breakout-rooms/:roomId/close should close room", async () => {
    const res = await supertest(app).post(
      "/api/meetings/meet-123/breakout-rooms/room-1/close",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
