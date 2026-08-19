/**
 * Unit tests for invitation CSV parsing (Issue #1362).
 */

import { describe, it, expect } from "@jest/globals";
import {
  splitCsvLine,
  parseInvitationCsv,
} from "../utils/invitationCsvParse.js";

describe("invitationCsvParse", () => {
  describe("splitCsvLine", () => {
    it("splits plain fields", () => {
      expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
    });

    it("handles quoted commas and escaped quotes", () => {
      expect(splitCsvLine('"a,b","say ""hi""",c')).toEqual([
        "a,b",
        'say "hi"',
        "c",
      ]);
    });

    it("throws on unmatched quotes", () => {
      expect(() => splitCsvLine('"open')).toThrow(/unmatched quote/i);
    });
  });

  describe("parseInvitationCsv", () => {
    it("parses valid CSV with optional message", () => {
      const csv = [
        "email,role,message",
        "alice@example.com,member,Welcome",
        "bob@example.com,admin,",
      ].join("\n");

      const { rows } = parseInvitationCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        row: 2,
        email: "alice@example.com",
        role: "member",
        message: "Welcome",
      });
      expect(rows[1].role).toBe("admin");
    });

    it("requires email and role headers", () => {
      expect(() => parseInvitationCsv("name,role\na,member")).toThrow(
        /email.*role/i,
      );
    });

    it("rejects empty CSV", () => {
      expect(() => parseInvitationCsv("")).toThrow(/empty/i);
    });

    it("ignores blank lines and strips BOM", () => {
      const csv = "\uFEFFemail,role\n\nalice@example.com,member\n\n";
      const { rows } = parseInvitationCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe("alice@example.com");
    });

    it("rejects malformed quoted rows", () => {
      expect(() =>
        parseInvitationCsv('email,role\n"bad@example.com,member'),
      ).toThrow(/malformed/i);
    });
  });
});
