import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Glossary from "../Glossary.jsx";
import * as api from "../../services/glossaryApi.js";

vi.mock("../../services/glossaryApi.js", () => ({
  fetchTerms: vi.fn(),
  createTerm: vi.fn(),
  deleteTerm: vi.fn(),
  approveTerm: vi.fn(),
}));

describe("Glossary Accessibility (#1491)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes WAI-ARIA dialog attributes when opening Add Term form", async () => {
    api.fetchTerms.mockResolvedValue([]);

    render(<Glossary />);

    const addButton = screen.getByRole("button", { name: /add term/i });
    fireEvent.click(addButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "add-term-title");
  });

  it("closes open form when pressing Escape key", async () => {
    api.fetchTerms.mockResolvedValue([]);

    render(<Glossary />);

    const addButton = screen.getByRole("button", { name: /add term/i });
    fireEvent.click(addButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows a user-friendly error state when glossary loading fails", async () => {
    api.fetchTerms.mockRejectedValueOnce(
      new Error("Request failed: 500 Internal Server Error"),
    );

    render(<Glossary />);

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "We couldn't load the glossary right now. Please try again.",
    );
    expect(alert).not.toHaveTextContent("500");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(
      screen.queryByText("No approved terms found."),
    ).not.toBeInTheDocument();
  });

  it("retries glossary loading and clears the error after success", async () => {
    api.fetchTerms
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce([
        {
          _id: "term-1",
          term: "ROI",
          definition: "Return on Investment",
          approvalStatus: "approved",
        },
      ]);

    render(<Glossary />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(api.fetchTerms).toHaveBeenCalledTimes(2);
      expect(screen.getByText("ROI")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
