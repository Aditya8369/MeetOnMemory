import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ContactForm from "../ContactForm.jsx";

describe("ContactForm support-bot CTA (#1794)", () => {
  it("points users to the automated support bot, not a live assistant", () => {
    render(
      <ContactForm
        formData={{}}
        setFormData={vi.fn()}
        submittedTicket={{
          id: "MOM-1",
          name: "Jane",
          department: "support",
          sla: "Within 12 hours",
          status: "Open / Queued",
          subject: "Help",
        }}
        setSubmittedTicket={vi.fn()}
        submitting={false}
        submitError=""
        handleFormSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /ask the support bot/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /live assistant/i }),
    ).not.toBeInTheDocument();
  });
});
