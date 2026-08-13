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
});
