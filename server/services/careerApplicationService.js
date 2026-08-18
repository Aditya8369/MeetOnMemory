import fs from "fs/promises";
import path from "path";
import CareerApplication, {
  CAREER_COVER_LETTER_MAX_LENGTH,
} from "../models/careerApplicationModel.js";
import { CAREER_JOBS, isValidCareerJobId } from "../constants/careerJobs.js";
import { ValidationError, ConflictError } from "../utils/errors.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;
const PORTFOLIO_MAX_LENGTH = 500;

/**
 * ReDoS-safe email validation aligned with invitationController.
 * @param {string} email
 * @returns {string|null}
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== "string") return null;
  const sanitized = email.trim().toLowerCase();
  if (sanitized.length > 254) return null;
  if (!sanitized.includes("@") || !sanitized.includes(".")) return null;
  const parts = sanitized.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || !domain) return null;
  if (local.length > 64) return null;
  if (domain.length > 255) return null;
  if (domain.split(".").length < 2) return null;
  return sanitized;
};

export const sanitizeName = (name) => {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < NAME_MIN_LENGTH || trimmed.length > NAME_MAX_LENGTH) {
    return null;
  }
  return trimmed;
};

export const sanitizePortfolio = (portfolio) => {
  if (portfolio == null || portfolio === "") return "";
  if (typeof portfolio !== "string") {
    throw new ValidationError("Portfolio must be a valid http or https URL.");
  }
  const trimmed = portfolio.trim();
  if (!trimmed) return "";
  if (trimmed.length > PORTFOLIO_MAX_LENGTH) {
    throw new ValidationError("Portfolio link is too long.");
  }
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new ValidationError("Portfolio must be a valid http or https URL.");
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Portfolio must be a valid http or https URL.");
  }
  return trimmed;
};

export const sanitizeCoverLetter = (coverLetter) => {
  if (coverLetter == null || coverLetter === "") return "";
  if (typeof coverLetter !== "string") {
    throw new ValidationError("Cover letter must be text.");
  }
  const trimmed = coverLetter.trim();
  if (trimmed.length > CAREER_COVER_LETTER_MAX_LENGTH) {
    throw new ValidationError(
      `Cover letter must be ${CAREER_COVER_LETTER_MAX_LENGTH} characters or fewer.`,
    );
  }
  return trimmed;
};

export const buildResumeMetadata = (file) => {
  if (!file) {
    throw new ValidationError("Resume file is required.");
  }
  return {
    originalName: file.originalname,
    storedName: path.basename(file.filename || file.path),
    mimeType: file.mimetype,
    size: file.size,
    filePath: file.path,
  };
};

export async function removeUploadedFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort cleanup for rejected or failed uploads.
  }
}

/**
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.email
 * @param {string} input.jobId
 * @param {string} [input.portfolio]
 * @param {string} [input.coverLetter]
 * @param {import("multer").File} input.resumeFile
 */
export async function submitCareerApplication({
  name,
  email,
  jobId,
  portfolio,
  coverLetter,
  resumeFile,
}) {
  const sanitizedName = sanitizeName(name);
  if (!sanitizedName) {
    await removeUploadedFile(resumeFile?.path);
    throw new ValidationError("Please provide a valid full name.");
  }

  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    await removeUploadedFile(resumeFile?.path);
    throw new ValidationError("Please provide a valid email address.");
  }

  const normalizedJobId =
    typeof jobId === "string" ? jobId.trim() : String(jobId ?? "");
  if (!isValidCareerJobId(normalizedJobId)) {
    await removeUploadedFile(resumeFile?.path);
    throw new ValidationError("Please select a valid job opening.");
  }

  const resume = buildResumeMetadata(resumeFile);
  const sanitizedPortfolio = sanitizePortfolio(portfolio);
  const sanitizedCoverLetter = sanitizeCoverLetter(coverLetter);
  const jobTitle = CAREER_JOBS[normalizedJobId].title;

  try {
    const application = await CareerApplication.create({
      name: sanitizedName,
      email: sanitizedEmail,
      jobId: normalizedJobId,
      jobTitle,
      portfolio: sanitizedPortfolio,
      coverLetter: sanitizedCoverLetter,
      resume: {
        originalName: resume.originalName,
        storedName: resume.storedName,
        mimeType: resume.mimeType,
        size: resume.size,
      },
    });

    return { id: application._id.toString() };
  } catch (err) {
    await removeUploadedFile(resume.filePath);
    if (err?.code === 11000) {
      throw new ConflictError(
        "You have already submitted an application for this role.",
      );
    }
    throw err;
  }
}

export default submitCareerApplication;
