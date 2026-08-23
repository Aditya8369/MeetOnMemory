import { describe, it, expect } from "vitest";
import {
  splitCsvLine,
  parseCsv,
  detectColumnMapping,
  isValidEmail,
  validateMappedRows,
  buildStandardCsv,
  generateSampleCsv,
} from "../csvParser";

describe("csvParser utility", () => {
  describe("splitCsvLine", () => {
    it("splits standard comma separated values", () => {
      expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
    });

    it("handles quoted values with commas inside", () => {
      expect(splitCsvLine('alice@example.com,"hello, world",member')).toEqual([
        "alice@example.com",
        "hello, world",
        "member",
      ]);
    });

    it("handles escaped quotes inside quotes", () => {
      expect(
        splitCsvLine('test@example.com,"hello ""friend""",member'),
      ).toEqual(["test@example.com", 'hello "friend"', "member"]);
    });

    it("throws on unmatched quotes", () => {
      expect(() => splitCsvLine('test@example.com,"unmatched')).toThrow(
        /unmatched quote/i,
      );
    });
  });

  describe("parseCsv", () => {
    it("parses valid CSV text into headers and rows", () => {
      const csv =
        "email,role,message\nalice@example.com,admin,hi\nbob@example.com,member,hello";
      const result = parseCsv(csv);
      expect(result.headers).toEqual(["email", "role", "message"]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        email: "alice@example.com",
        role: "admin",
        message: "hi",
      });
      expect(result.rows[1]).toEqual({
        email: "bob@example.com",
        role: "member",
        message: "hello",
      });
    });

    it("strips BOM and handles CRLF newlines", () => {
      const csv = "\uFEFFemail,role\r\nalice@example.com,member\r\n";
      const result = parseCsv(csv);
      expect(result.headers).toEqual(["email", "role"]);
      expect(result.rows).toHaveLength(1);
    });

    it("throws for empty input", () => {
      expect(() => parseCsv("")).toThrow(/required|empty/i);
      expect(() => parseCsv("   \n\n  ")).toThrow(/empty/i);
    });
  });

  describe("detectColumnMapping", () => {
    it("detects standard headers", () => {
      const headers = ["email", "role", "message"];
      const mapping = detectColumnMapping(headers);
      expect(mapping).toEqual({
        email: "email",
        role: "role",
        message: "message",
      });
    });

    it("detects non-standard variations of headers", () => {
      const headers = ["Email Address", "User Role", "Personal Message"];
      const mapping = detectColumnMapping(headers);
      expect(mapping).toEqual({
        email: "Email Address",
        role: "User Role",
        message: "Personal Message",
      });
    });

    it("falls back to headers containing 'mail'", () => {
      const headers = ["User_Mail", "Access", "Notes"];
      const mapping = detectColumnMapping(headers);
      expect(mapping.email).toBe("User_Mail");
      expect(mapping.role).toBe("Access");
      expect(mapping.message).toBe("Notes");
    });
  });

  describe("isValidEmail", () => {
    it("validates good email addresses", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@sub.domain.co")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isValidEmail("@missinglocal.com")).toBe(false);
      expect(isValidEmail("missingdomain@")).toBe(false);
      expect(isValidEmail("missingdot@com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe("validateMappedRows", () => {
    it("validates rows and flags duplicate emails in the CSV", () => {
      const rows = [
        { "User Email": "alice@example.com", Role: "admin", Note: "Welcome" },
        { "User Email": "invalid-email", Role: "member", Note: "" },
        {
          "User Email": "alice@example.com",
          Role: "member",
          Note: "Duplicate",
        },
        { "User Email": "bob@example.com", Role: "invalid-role", Note: "" },
        {
          "User Email": "charlie@example.com",
          Role: "",
          Note: "No role provided",
        },
      ];

      const mapping = {
        email: "User Email",
        role: "Role",
        message: "Note",
      };

      const result = validateMappedRows(rows, mapping, "member");

      expect(result.total).toBe(5);
      expect(result.validCount).toBe(2); // alice (first occurrence), charlie (defaults to member)
      expect(result.invalidCount).toBe(3); // invalid-email, duplicate alice, invalid-role

      expect(result.validatedRows[0].isValid).toBe(true);
      expect(result.validatedRows[1].isValid).toBe(false);
      expect(result.validatedRows[1].errors).toContain(
        "Invalid email address format",
      );

      expect(result.validatedRows[2].isValid).toBe(false);
      expect(result.validatedRows[2].isDuplicate).toBe(true);
      expect(result.validatedRows[2].errors).toContain(
        "Duplicate email in this CSV file",
      );

      expect(result.validatedRows[3].isValid).toBe(false);
      expect(result.validatedRows[3].errors[0]).toMatch(/invalid role/i);

      expect(result.validatedRows[4].isValid).toBe(true);
      expect(result.validatedRows[4].role).toBe("member");
    });
  });

  describe("buildStandardCsv and generateSampleCsv", () => {
    it("generates clean RFC standard CSV from mapped valid rows", () => {
      const rows = [
        { email: "alice@example.com", role: "admin", message: "Hi, Alice!" },
        { email: "bob@example.com", role: "member", message: 'Say "hello"' },
      ];

      const output = buildStandardCsv(rows);
      expect(output).toContain("email,role,message");
      expect(output).toContain('alice@example.com,admin,"Hi, Alice!"');
      expect(output).toContain('bob@example.com,member,"Say ""hello"""');
    });

    it("generates a downloadable sample CSV", () => {
      const sample = generateSampleCsv();
      expect(sample).toContain("email,role,message");
      expect(sample).toContain("alex.smith@example.com");
    });
  });
});
