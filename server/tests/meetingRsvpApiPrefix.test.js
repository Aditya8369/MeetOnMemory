// server/tests/meetingRsvpApiPrefix.test.js
import express from "express";
import supertest from "supertest";
import meetingRsvpRoutes from "../routes/meetingRsvpRoutes.js";

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
jest.mock("../controllers/meetingRsvpController.js", () => ({
  getPendingRsvps: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).json({ success: true, data: [] }),
    ),
  getMeetingSummary: jest
    .fn()
    .mockImplementation((req, res) =>
      res
        .status(200)
        .json({ success: true, data: { meetingId: req.params.meetingId } }),
    ),
  sendRsvpRequests: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).json({ success: true, message: "RSVP requests sent" }),
    ),
  respondToRsvp: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).json({ success: true, status: req.body.status }),
    ),
}));

describe("RSVP API Route & Path Prefix Tests (#1884)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/rsvps", meetingRsvpRoutes);
  });

  it("GET /api/rsvps/pending should resolve under /api/rsvps prefix", async () => {
    const res = await supertest(app).get("/api/rsvps/pending");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/rsvps/meeting/:meetingId should resolve under /api/rsvps prefix", async () => {
    const res = await supertest(app).get("/api/rsvps/meeting/meet-123");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meetingId).toBe("meet-123");
  });

  it("POST /api/rsvps/send/:meetingId should resolve under /api/rsvps prefix", async () => {
    const res = await supertest(app)
      .post("/api/rsvps/send/meet-123")
      .send({ userIds: ["user-1"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("PUT /api/rsvps/:meetingId/respond should resolve under /api/rsvps prefix", async () => {
    const res = await supertest(app)
      .put("/api/rsvps/meet-123/respond")
      .send({ status: "accepted" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("accepted");
  });
});
