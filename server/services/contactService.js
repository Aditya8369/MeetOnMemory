import ContactMessage, {
  VALID_DEPARTMENTS,
  SLA_BY_DEPARTMENT,
  MESSAGE_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from "../models/contactMessageModel.js";
import { ValidationError } from "../utils/errors.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;

/**
 * ReDoS-safe email validation aligned with invitationController / careerApplicationService.
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

/**
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.email
 * @param {string} [input.organization]
 * @param {string} input.department
 * @param {string} input.subject
 * @param {string} input.message
 */
export async function submitContactMessage({
  name,
  email,
  organization,
  department,
  subject,
  message,
}) {
  const sanitizedName = sanitizeName(name);
  if (!sanitizedName) {
    throw new ValidationError(
      "Please provide a valid name (2–120 characters).",
    );
  }

  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    throw new ValidationError("Please provide a valid email address.");
  }

  const normalizedDept =
    typeof department === "string" ? department.trim().toLowerCase() : "";
  if (!VALID_DEPARTMENTS.includes(normalizedDept)) {
    throw new ValidationError(
      `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(", ")}.`,
    );
  }

  const trimmedSubject = typeof subject === "string" ? subject.trim() : "";
  if (!trimmedSubject || trimmedSubject.length > SUBJECT_MAX_LENGTH) {
    throw new ValidationError(
      `Subject is required and must be ${SUBJECT_MAX_LENGTH} characters or fewer.`,
    );
  }

  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage || trimmedMessage.length > MESSAGE_MAX_LENGTH) {
    throw new ValidationError(
      `Message is required and must be ${MESSAGE_MAX_LENGTH} characters or fewer.`,
    );
  }

  const trimmedOrg =
    organization && typeof organization === "string"
      ? organization.trim().slice(0, 200)
      : "";

  const doc = await ContactMessage.create({
    name: sanitizedName,
    email: sanitizedEmail,
    organization: trimmedOrg,
    department: normalizedDept,
    subject: trimmedSubject,
    message: trimmedMessage,
  });

  return {
    ticketId: doc.ticketId,
    department: doc.department,
    sla: SLA_BY_DEPARTMENT[doc.department],
  };
}

export default submitContactMessage;
