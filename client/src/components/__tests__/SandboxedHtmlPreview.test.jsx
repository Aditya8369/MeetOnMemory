import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SandboxedHtmlPreview from "../SandboxedHtmlPreview.jsx";

const iframeSrcDoc = (title) =>
  screen.getByTitle(title).getAttribute("srcdoc") || "";

describe("SandboxedHtmlPreview (#1391)", () => {
  it("renders sanitized HTML inside a maximally restricted iframe", () => {
    render(
      <SandboxedHtmlPreview
        htmlContent="<p>Meeting Recap</p>"
        title="Email Preview"
      />,
    );

    const iframe = screen.getByTitle("Email Preview");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("sandbox")).toBe("");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(iframe.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(iframeSrcDoc("Email Preview")).toContain("Meeting Recap");
  });

  it("strips script tags before assigning srcDoc", () => {
    render(
      <SandboxedHtmlPreview
        htmlContent={`<p>Safe recap</p><script>alert("xss")</script>`}
        title="Email Preview"
      />,
    );

    const srcDoc = iframeSrcDoc("Email Preview");
    expect(srcDoc).toContain("Safe recap");
    expect(srcDoc).not.toMatch(/<script/i);
    expect(srcDoc).not.toContain("alert(");
  });

  it("strips event handlers before assigning srcDoc", () => {
    render(
      <SandboxedHtmlPreview
        htmlContent={`<img src="x" onerror="alert(1)" /><p onclick="steal()">Summary</p>`}
        title="Email Preview"
      />,
    );

    const srcDoc = iframeSrcDoc("Email Preview");
    expect(srcDoc).toContain("Summary");
    expect(srcDoc).not.toMatch(/onerror/i);
    expect(srcDoc).not.toMatch(/onclick/i);
    expect(srcDoc).not.toContain("alert(");
    expect(srcDoc).not.toContain("steal(");
  });

  it("blocks javascript: URLs before assigning srcDoc", () => {
    render(
      <SandboxedHtmlPreview
        htmlContent={`<a href="javascript:alert(1)">Open recap</a>`}
        title="Email Preview"
      />,
    );

    const srcDoc = iframeSrcDoc("Email Preview");
    expect(srcDoc).toContain("Open recap");
    expect(srcDoc).not.toMatch(/javascript:/i);
  });

  it("preserves legitimate recap markup", () => {
    render(
      <SandboxedHtmlPreview
        htmlContent={`
          <div style="font-family: sans-serif;">
            <h2>Meeting Recap: Project Alpha Kickoff</h2>
            <p>Date: 1/15/2026</p>
          </div>
        `}
        title="Email Preview"
      />,
    );

    const srcDoc = iframeSrcDoc("Email Preview");
    expect(srcDoc).toContain("Meeting Recap: Project Alpha Kickoff");
    expect(srcDoc).toContain("Date: 1/15/2026");
    expect(srcDoc).toMatch(/<h2/i);
  });

  it("renders nothing when HTML is empty after sanitization", () => {
    const { container } = render(
      <SandboxedHtmlPreview htmlContent="" title="Email Preview" />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTitle("Email Preview")).not.toBeInTheDocument();
  });
});
