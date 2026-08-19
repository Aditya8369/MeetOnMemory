/**
 * Issue #1793 — contact message service validation and persistence.
 */

import { jest } from "@jest/globals";

jest.unstable_mockModule("../models/contactMessageModel.js", () => ({
  default: {
    create: jest.fn(),
  },
  VALID_DEPARTMENTS: ["support", "sales", "billing", "security"],
  SLA_BY_DEPARTMENT: {
    support: "Within 12 hours",
    sales: "Within 4 hours",
    billing: "Within 12 hours",
    security: "Within 4 hours",
  },
  MESSAGE_MAX_LENGTH: 5000,
  SUBJECT_MAX_LENGTH: 200,
}));

const ContactMessage = (await import("../models/contactMessageModel.js"))
  .default;

const { sanitizeEmail, sanitizeName, submitContactMessage } =
  await import("../services/contactService.js");

describe("contactService (#1793)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sanitizes valid emails", () => {
    expect(sanitizeEmail("  Jane@Example.COM ")).toBe("jane@example.com");
  });

  it("rejects invalid emails", () => {
    expect(sanitizeEmail("not-an-email")).toBeNull();
    expect(sanitizeEmail("")).toBeNull();
    expect(sanitizeEmail(null)).toBeNull();
  });

  it("sanitizes names", () => {
    expect(sanitizeName("  Jane   Doe  ")).toBe("Jane Doe");
    expect(sanitizeName("A")).toBeNull();
  });

  it("creates a contact message with a server-generated ticket ID", async () => {
    ContactMessage.create.mockResolvedValueOnce({
      ticketId: "MOM-654321",
      department: "support",
    });

    const result = await submitContactMessage({
      name: "Jane Doe",
      email: "jane@example.com",
      organization: "Acme",
      department: "support",
      subject: "Help with transcripts",
      message: "I cannot see my transcripts.",
    });

    expect(result).toEqual({
      ticketId: "MOM-654321",
      department: "support",
      sla: "Within 12 hours",
    });
    expect(ContactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        email: "jane@example.com",
        department: "support",
        subject: "Help with transcripts",
      }),
    );
  });

  it("rejects invalid department", async () => {
    await expect(
      submitContactMessage({
        name: "Jane Doe",
        email: "jane@example.com",
        department: "hacking",
        subject: "Test",
        message: "Test",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("Invalid department"),
    });
    expect(ContactMessage.create).not.toHaveBeenCalled();
  });

  it("rejects missing subject", async () => {
    await expect(
      submitContactMessage({
        name: "Jane Doe",
        email: "jane@example.com",
        department: "support",
        subject: "",
        message: "Test",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("Subject is required"),
    });
  });

  it("rejects missing message", async () => {
    await expect(
      submitContactMessage({
        name: "Jane Doe",
        email: "jane@example.com",
        department: "support",
        subject: "Test",
        message: "",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("Message is required"),
    });
  });

  it("rejects invalid email", async () => {
    await expect(
      submitContactMessage({
        name: "Jane Doe",
        email: "bad-email",
        department: "support",
        subject: "Test",
        message: "Test message",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("valid email"),
    });
  });

  it("rejects short names", async () => {
    await expect(
      submitContactMessage({
        name: "A",
        email: "jane@example.com",
        department: "support",
        subject: "Test",
        message: "Test message",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("valid name"),
    });
  });
});
