/**
 * Issue #1793 — public contact form submission route.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockSubmitContactMessage = jest.fn();

jest.unstable_mockModule("../services/contactService.js", () => ({
  submitContactMessage: (...args) => mockSubmitContactMessage(...args),
}));

const errorHandler = (await import("../middleware/errorHandler.js")).default;
const { createContactRoutes } = await import("../routes/contactRoutes.js");
const { ValidationError } = await import("../utils/errors.js");

const buildContactApp = () => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/contact",
    createContactRoutes({
      submitLimiter: (_req, _res, next) => next(),
    }),
  );
  app.use(errorHandler);
  return app;
};

describe("POST /api/contact (#1793)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitContactMessage.mockResolvedValue({
      ticketId: "MOM-123456",
      department: "support",
      sla: "Within 12 hours",
    });
  });

  it("creates a support ticket and returns a real ticket ID", async () => {
    const app = buildContactApp();

    const res = await request(app).post("/api/contact").send({
      name: "Jane Doe",
      email: "jane@example.com",
      organization: "Acme Corp",
      department: "support",
      subject: "Cannot access transcripts",
      message: "My transcripts page shows a blank screen since yesterday.",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "Support ticket created successfully.",
        ticketId: "MOM-123456",
        department: "support",
        sla: "Within 12 hours",
        status: "Open / Queued",
      }),
    );
    expect(res.body).not.toHaveProperty("email");
    expect(res.body).not.toHaveProperty("messageBody");

    expect(mockSubmitContactMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        email: "jane@example.com",
        department: "support",
        subject: "Cannot access transcripts",
      }),
    );
  });

  it("returns validation errors from the service layer", async () => {
    mockSubmitContactMessage.mockRejectedValueOnce(
      new ValidationError("Please provide a valid email address."),
    );

    const app = buildContactApp();
    const res = await request(app).post("/api/contact").send({
      name: "Jane Doe",
      email: "bad-email",
      department: "support",
      subject: "Test",
      message: "Test message",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Please provide a valid email address.",
      }),
    );
  });

  it("returns validation error for invalid department", async () => {
    mockSubmitContactMessage.mockRejectedValueOnce(
      new ValidationError(
        "Invalid department. Must be one of: support, sales, billing, security.",
      ),
    );

    const app = buildContactApp();
    const res = await request(app).post("/api/contact").send({
      name: "Jane Doe",
      email: "jane@example.com",
      department: "hacking",
      subject: "Test",
      message: "Test message",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid department/);
  });

  it("returns validation error for missing required fields", async () => {
    mockSubmitContactMessage.mockRejectedValueOnce(
      new ValidationError(
        "Subject is required and must be 200 characters or fewer.",
      ),
    );

    const app = buildContactApp();
    const res = await request(app).post("/api/contact").send({
      name: "Jane Doe",
      email: "jane@example.com",
      department: "support",
      subject: "",
      message: "Test",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
