/**
 * Issue #1790 — public careers application route and resume upload.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockSubmitCareerApplication = jest.fn();

jest.unstable_mockModule("../services/careerApplicationService.js", () => ({
  submitCareerApplication: (...args) => mockSubmitCareerApplication(...args),
  removeUploadedFile: jest.fn(),
}));

const errorHandler = (await import("../middleware/errorHandler.js")).default;
const { createCareerRoutes } = await import("../routes/careerRoutes.js");
const { ValidationError, ConflictError } = await import("../utils/errors.js");

const buildCareersApp = () => {
  const app = express();
  app.use(
    "/api/careers",
    createCareerRoutes({
      submitLimiter: (_req, _res, next) => next(),
    }),
  );
  app.use(errorHandler);
  return app;
};

describe("POST /api/careers/applications (#1790)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitCareerApplication.mockResolvedValue({ id: "app-123" });
  });

  it("accepts multipart applications with a resume file", async () => {
    const app = buildCareersApp();

    const res = await request(app)
      .post("/api/careers/applications")
      .field("name", "Jane Doe")
      .field("email", "jane@example.com")
      .field("jobId", "ai-engineer")
      .field("portfolio", "https://github.com/jane")
      .field("coverLetter", "I build AI products.")
      .attach("resume", Buffer.from("%PDF-1.4 test"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "Application submitted successfully.",
        applicationId: "app-123",
      }),
    );
    expect(res.body).not.toHaveProperty("email");
    expect(res.body).not.toHaveProperty("resume");

    expect(mockSubmitCareerApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        email: "jane@example.com",
        jobId: "ai-engineer",
        resumeFile: expect.objectContaining({
          originalname: "resume.pdf",
          mimetype: "application/pdf",
        }),
      }),
    );
  });

  it("returns validation errors from the service layer", async () => {
    mockSubmitCareerApplication.mockRejectedValueOnce(
      new ValidationError("Please provide a valid email address."),
    );

    const app = buildCareersApp();
    const res = await request(app)
      .post("/api/careers/applications")
      .field("name", "Jane Doe")
      .field("email", "bad-email")
      .field("jobId", "general")
      .attach("resume", Buffer.from("%PDF-1.4 test"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Please provide a valid email address.",
      }),
    );
  });

  it("returns conflict errors for duplicate applications", async () => {
    mockSubmitCareerApplication.mockRejectedValueOnce(
      new ConflictError(
        "You have already submitted an application for this role.",
      ),
    );

    const app = buildCareersApp();
    const res = await request(app)
      .post("/api/careers/applications")
      .field("name", "Jane Doe")
      .field("email", "jane@example.com")
      .field("jobId", "general")
      .attach("resume", Buffer.from("%PDF-1.4 test"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "You have already submitted an application for this role.",
    );
  });

  it("rejects unsupported resume file types before hitting the service", async () => {
    const app = buildCareersApp();
    const res = await request(app)
      .post("/api/careers/applications")
      .field("name", "Jane Doe")
      .field("email", "jane@example.com")
      .field("jobId", "general")
      .attach("resume", Buffer.from("not a resume"), {
        filename: "resume.exe",
        contentType: "application/octet-stream",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid resume file/i);
    expect(mockSubmitCareerApplication).not.toHaveBeenCalled();
  });

  it("requires a resume attachment", async () => {
    const app = buildCareersApp();
    const res = await request(app)
      .post("/api/careers/applications")
      .field("name", "Jane Doe")
      .field("email", "jane@example.com")
      .field("jobId", "general");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Resume file is required.");
    expect(mockSubmitCareerApplication).not.toHaveBeenCalled();
  });
});
