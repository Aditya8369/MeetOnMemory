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

vi.mock("../services/dataExtractor.js", () => ({
  default: {
    extractMeetingData: vi.fn().mockResolvedValue({ title: "Sprint Demo" }),
    applySectionFilters: vi.fn().mockImplementation((data) => data),
  },
}));

vi.mock("../services/documentGenerator.js", () => ({
  default: {
    renderHTML: vi
      .fn()
      .mockImplementation((templateContent, data) =>
        templateContent.replace("{{title}}", data.title || "Demo"),
      ),
    sanitizeHTML: vi.fn().mockImplementation((html) => html),
    generatePDF: vi.fn().mockResolvedValue(Buffer.from("dummy pdf")),
    generateDOCX: vi.fn().mockResolvedValue(Buffer.from("dummy docx")),
  },
}));

vi.mock("../models/ExportTemplate.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../utils/resolveAccessibleMeeting.js", () => ({
  resolveAccessibleMeeting: vi.fn(),
}));

import exportRoutes from "../routes/export.routes.js";
import ExportTemplate from "../models/ExportTemplate.js";

describe("Export Routes API (/api/export-templates & /api/exports) (#2003)", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(["/api/export-templates", "/api/exports"], exportRoutes);
  });

  it("GET /api/export-templates returns user accessible templates", async () => {
    const mockTemplates = [
      { _id: "t-1", name: "Standard Template", isPublic: true },
    ];
    ExportTemplate.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockTemplates),
    });

    const res = await request(app).get("/api/export-templates");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockTemplates);
  });

  it("POST /api/export-templates creates a custom template", async () => {
    const payload = {
      name: "Custom Agenda Template",
      templateContent: "<h1>{{title}}</h1>",
    };
    ExportTemplate.create.mockResolvedValue({ _id: "t-2", ...payload });

    const res = await request(app).post("/api/export-templates").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe("t-2");
  });

  it("POST /api/export-templates/preview renders template preview HTML", async () => {
    const payload = {
      templateContent: "<h1>{{title}}</h1>",
      meetingData: { title: "Sprint Demo" },
    };

    const res = await request(app)
      .post("/api/export-templates/preview")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.html).toContain("Sprint Demo");
  });
});
