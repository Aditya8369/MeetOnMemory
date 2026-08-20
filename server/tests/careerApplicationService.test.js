/**
 * Issue #1790 — careers application service validation and persistence.
 */

import { jest } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import os from "os";

jest.unstable_mockModule("../models/careerApplicationModel.js", () => ({
  default: {
    create: jest.fn(),
  },
  CAREER_COVER_LETTER_MAX_LENGTH: 2000,
}));

const CareerApplication = (await import("../models/careerApplicationModel.js"))
  .default;

const {
  sanitizeEmail,
  sanitizeName,
  submitCareerApplication,
  removeUploadedFile,
} = await import("../services/careerApplicationService.js");

describe("careerApplicationService (#1790)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sanitizes valid applicant emails", () => {
    expect(sanitizeEmail("  Ada.Lovelace@Example.COM ")).toBe(
      "ada.lovelace@example.com",
    );
  });

  it("rejects invalid applicant emails", () => {
    expect(sanitizeEmail("not-an-email")).toBeNull();
  });

  it("sanitizes applicant names", () => {
    expect(sanitizeName("  Jane   Doe  ")).toBe("Jane Doe");
    expect(sanitizeName("A")).toBeNull();
  });

  it("creates an application with server-derived job title", async () => {
    CareerApplication.create.mockResolvedValueOnce({
      _id: { toString: () => "app-123" },
    });

    const tmpFile = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
    await fs.writeFile(tmpFile, "dummy resume");

    const result = await submitCareerApplication({
      name: "Jane Doe",
      email: "jane@example.com",
      jobId: "sr-frontend",
      portfolio: "https://github.com/jane",
      coverLetter: "Excited to join MeetOnMemory.",
      resumeFile: {
        originalname: "resume.pdf",
        filename: path.basename(tmpFile),
        path: tmpFile,
        mimetype: "application/pdf",
        size: 12,
      },
    });

    expect(result).toEqual({ id: "app-123" });
    expect(CareerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        email: "jane@example.com",
        jobId: "sr-frontend",
        jobTitle: "Senior Frontend Engineer",
        portfolio: "https://github.com/jane",
      }),
    );
  });

  it("rejects invalid job identifiers and cleans up uploaded files", async () => {
    const tmpFile = path.join(os.tmpdir(), `bad-job-${Date.now()}.pdf`);
    await fs.writeFile(tmpFile, "dummy resume");

    await expect(
      submitCareerApplication({
        name: "Jane Doe",
        email: "jane@example.com",
        jobId: "not-a-real-role",
        resumeFile: {
          originalname: "resume.pdf",
          filename: path.basename(tmpFile),
          path: tmpFile,
          mimetype: "application/pdf",
          size: 12,
        },
      }),
    ).rejects.toMatchObject({
      message: "Please select a valid job opening.",
      statusCode: 400,
    });

    await expect(fs.access(tmpFile)).rejects.toThrow();
    expect(CareerApplication.create).not.toHaveBeenCalled();
  });

  it("maps duplicate applications to a conflict error", async () => {
    const tmpFile = path.join(os.tmpdir(), `dup-${Date.now()}.pdf`);
    await fs.writeFile(tmpFile, "dummy resume");
    CareerApplication.create.mockRejectedValueOnce({ code: 11000 });

    await expect(
      submitCareerApplication({
        name: "Jane Doe",
        email: "jane@example.com",
        jobId: "general",
        resumeFile: {
          originalname: "resume.pdf",
          filename: path.basename(tmpFile),
          path: tmpFile,
          mimetype: "application/pdf",
          size: 12,
        },
      }),
    ).rejects.toMatchObject({
      message: "You have already submitted an application for this role.",
      statusCode: 409,
    });

    await expect(fs.access(tmpFile)).rejects.toThrow();
  });

  it("removeUploadedFile is best-effort", async () => {
    await expect(
      removeUploadedFile(path.join(os.tmpdir(), "missing-career-resume.pdf")),
    ).resolves.toBeUndefined();
  });
});
