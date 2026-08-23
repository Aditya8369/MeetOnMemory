import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../sanitizeHtml.js";

const LEGITIMATE_RECAP_HTML = `
<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
  <h2 style="color: #2563eb;">Meeting Recap: Project Alpha Kickoff</h2>
  <p style="color: #666;">Date: 1/15/2026</p>
  <hr />
  <h3 style="color: #1e40af;">Summary</h3>
  <p style="white-space: pre-wrap;">We discussed the roadmap for Project Alpha.</p>
  <h3 style="color: #1e40af;">Action Items</h3>
  <ul>
    <li><strong>Jane:</strong> Draft the Q3 plan <em>(Due: 2/1/2026)</em></li>
  </ul>
</div>
`;

describe("sanitizeHtml (#1391)", () => {
  it("strips script tags and their contents", () => {
    const sanitized = sanitizeHtml(
      `<p>Safe</p><script>alert("xss")</script><p>Also safe</p>`,
    );

    expect(sanitized).toContain("Safe");
    expect(sanitized).toContain("Also safe");
    expect(sanitized).not.toMatch(/<script/i);
    expect(sanitized).not.toContain("alert(");
  });

  it("removes inline event-handler attributes", () => {
    const sanitized = sanitizeHtml(
      `<img src="x" onerror="alert(1)" /><div onclick="alert(2)">Recap</div>`,
    );

    expect(sanitized).not.toMatch(/onerror/i);
    expect(sanitized).not.toMatch(/onclick/i);
    expect(sanitized).not.toContain("alert(");
    expect(sanitized).toContain("Recap");
  });

  it("blocks javascript: URLs", () => {
    const sanitized = sanitizeHtml(
      `<a href="javascript:alert(1)">Open recap</a>`,
    );

    expect(sanitized).not.toMatch(/javascript:/i);
    expect(sanitized).not.toContain("alert(");
    expect(sanitized).toContain("Open recap");
  });

  it("preserves legitimate recap/email preview markup", () => {
    const sanitized = sanitizeHtml(LEGITIMATE_RECAP_HTML);

    expect(sanitized).toContain("Meeting Recap: Project Alpha Kickoff");
    expect(sanitized).toContain("We discussed the roadmap for Project Alpha.");
    expect(sanitized).toContain("Jane:");
    expect(sanitized).toMatch(/<h2/i);
    expect(sanitized).toMatch(/<h3/i);
    expect(sanitized).toMatch(/<ul/i);
    expect(sanitized).toMatch(/<strong/i);
    expect(sanitized).toMatch(/<em/i);
    expect(sanitized).toMatch(/style=/i);
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });
});
