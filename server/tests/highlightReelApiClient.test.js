// server/tests/highlightReelApiClient.test.js
import express from "express";
import supertest from "supertest";
import highlightReelRoutes from "../routes/highlightReelRoutes.js";

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
jest.mock("../controllers/highlightReelController.js", () => ({
  getHighlightReel: jest.fn().mockImplementation((req, res) =>
    res.status(200).json({
      success: true,
      data: { status: "completed", narrative: "Meeting summary..." },
    }),
  ),
  generateHighlightReel: jest
    .fn()
    .mockImplementation((req, res) =>
      res
        .status(200)
        .json({ success: true, message: "Highlight reel generation started" }),
    ),
  exportHighlightReelHtml: jest
    .fn()
    .mockImplementation((req, res) =>
      res.status(200).send("<html>Highlight Reel</html>"),
    ),
}));

describe("Highlight Reel API Client Route Tests (#1894)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/meetings", highlightReelRoutes);
  });

  it("GET /api/meetings/:meetingId/highlight-reel should resolve under /api/meetings prefix", async () => {
    const res = await supertest(app).get(
      "/api/meetings/meet-123/highlight-reel",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("completed");
  });

  it("POST /api/meetings/:meetingId/highlight-reel/generate should resolve under /api/meetings prefix", async () => {
    const res = await supertest(app).post(
      "/api/meetings/meet-123/highlight-reel/generate",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/meetings/:meetingId/highlight-reel/export should resolve under /api/meetings prefix", async () => {
    const res = await supertest(app).get(
      "/api/meetings/meet-123/highlight-reel/export",
    );

    expect(res.status).toBe(200);
    expect(res.text).toContain("Highlight Reel");
  });
});
