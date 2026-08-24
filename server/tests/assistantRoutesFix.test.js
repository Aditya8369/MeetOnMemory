import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = {
      _id: "user-123",
      role: "member",
      organization: "org-123",
    };
    next();
  },
}));

vi.mock("../services/ragAssistantService.js", () => ({
  createSession: vi
    .fn()
    .mockResolvedValue({ _id: "s-100", title: "New Session" }),
  listSessions: vi
    .fn()
    .mockResolvedValue([{ _id: "s-100", title: "New Session" }]),
  getSession: vi
    .fn()
    .mockResolvedValue({ _id: "s-100", title: "New Session", messages: [] }),
  deleteSession: vi.fn().mockResolvedValue(true),
  renameSession: vi
    .fn()
    .mockResolvedValue({ _id: "s-100", title: "Renamed Session" }),
  setPinnedContext: vi.fn().mockResolvedValue({
    _id: "s-100",
    pinnedContext: { type: "meeting", refId: "m-1" },
  }),
  clearPinnedContext: vi
    .fn()
    .mockResolvedValue({ _id: "s-100", pinnedContext: null }),
  processMessage: vi.fn().mockResolvedValue(true),
}));

import assistantRoutes from "../routes/assistantRoutes.js";

describe("Assistant Routes API (/api/assistant) (#2011)", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/assistant", assistantRoutes);
  });

  it("POST /api/assistant/sessions creates a new session", async () => {
    const res = await request(app).post("/api/assistant/sessions");

    expect(res.status).toBe(201);
    expect(res.body._id).toBe("s-100");
  });

  it("GET /api/assistant/sessions returns user sessions", async () => {
    const res = await request(app).get("/api/assistant/sessions");

    expect(res.status).toBe(200);
    expect(res.body[0]._id).toBe("s-100");
  });

  it("PUT /api/assistant/sessions/:id/pinned-context updates pinned context", async () => {
    const res = await request(app)
      .put("/api/assistant/sessions/s-100/pinned-context")
      .send({ type: "meeting", refId: "m-1", title: "Demo" });

    expect(res.status).toBe(200);
    expect(res.body.pinnedContext.refId).toBe("m-1");
  });
});
