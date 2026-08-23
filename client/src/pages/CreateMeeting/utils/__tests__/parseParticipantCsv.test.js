import { describe, expect, it } from "vitest";
import {
  parseParticipantCsv,
  isValidParticipantEmail,
} from "../parseParticipantCsv.js";

describe("parseParticipantCsv (Issue #2056)", () => {
  it("parses valid rows with optional role", () => {
    const csv = `email,name,role
ada@example.com,Ada Lovelace,host
bob@example.com,Bob Builder,
`;
    const result = parseParticipantCsv(csv);
    expect(result.valid).toEqual([
      { name: "Ada Lovelace", email: "ada@example.com", role: "host" },
      { name: "Bob Builder", email: "bob@example.com", role: "" },
    ]);
    expect(result.invalid).toHaveLength(0);
  });

  it("reports invalid emails and missing names", () => {
    const csv = `email,name,role
not-an-email,Broken,
ok@example.com,,
`;
    const result = parseParticipantCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "Invalid email address.",
          email: "not-an-email",
        }),
        expect.objectContaining({ reason: "Name is required." }),
      ]),
    );
  });

  it("skips duplicates against existing and within CSV", () => {
    const csv = `email,name
ada@example.com,Ada
ADA@example.com,Ada Again
new@example.com,New Person
`;
    const result = parseParticipantCsv(csv, ["ada@example.com"]);
    expect(result.valid).toEqual([
      { name: "New Person", email: "new@example.com", role: "" },
    ]);
    expect(result.skippedDuplicates).toBe(2);
  });

  it("requires email and name headers", () => {
    expect(() => parseParticipantCsv("email,role\na@b.com,host")).toThrow(
      /email.*name/i,
    );
  });

  it("validates emails", () => {
    expect(isValidParticipantEmail("a@b.co")).toBe(true);
    expect(isValidParticipantEmail("bad")).toBe(false);
  });
});
