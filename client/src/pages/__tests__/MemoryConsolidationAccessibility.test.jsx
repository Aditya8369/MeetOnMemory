import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import MemoryConsolidation from "../MemoryConsolidation.jsx";
import { knowledgeApi } from "../../services";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

vi.mock("../../services", () => ({
  knowledgeApi: {
    getConsolidationHistory: vi.fn(),
    runConsolidation: vi.fn(),
  },
}));

describe("MemoryConsolidation Accessibility & Error Boundary (#1963)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Navbar and ARIA regions with history list", async () => {
    knowledgeApi.getConsolidationHistory.mockResolvedValueOnce({
      data: {
        success: true,
        memories: [
          {
            _id: "m_1",
            text: "Approved product roadmap for Q3",
            aliases: ["Q3 Roadmap plan"],
            mergedFrom: ["m_old1"],
            lastConsolidatedAt: "2026-08-20",
          },
        ],
      },
    });

    render(
      <BrowserRouter>
        <MemoryConsolidation />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shared-navbar")).toBeInTheDocument();
      expect(
        screen.getByText("Approved product roadmap for Q3"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("region", { name: "Memory Consolidation Controls" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Consolidated Memories History" }),
    ).toBeInTheDocument();
  });

  it("displays error state when history fails and retries successfully", async () => {
    knowledgeApi.getConsolidationHistory.mockRejectedValueOnce(
      new Error("Network Error"),
    );

    render(
      <BrowserRouter>
        <MemoryConsolidation />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("history-error-state")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Failed to load consolidation history. Please try again.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId("history-retry-button")).toBeInTheDocument();
    });

    knowledgeApi.getConsolidationHistory.mockResolvedValueOnce({
      data: {
        success: true,
        memories: [],
      },
    });

    fireEvent.click(screen.getByTestId("history-retry-button"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("history-error-state"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("No memories have been consolidated yet."),
      ).toBeInTheDocument();
    });
  });

  it("disables select dropdown and buttons while consolidation is running", async () => {
    knowledgeApi.getConsolidationHistory.mockResolvedValue({
      data: { success: true, memories: [] },
    });

    // Make runConsolidation stay unresolved to inspect running state
    let resolveRun;
    knowledgeApi.runConsolidation.mockReturnValue(
      new Promise((res) => {
        resolveRun = res;
      }),
    );

    render(
      <BrowserRouter>
        <MemoryConsolidation />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /preview merges/i }),
      ).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Select Memory Type");
    const previewBtn = screen.getByRole("button", { name: /preview merges/i });

    expect(select).not.toBeDisabled();
    expect(previewBtn).not.toBeDisabled();

    fireEvent.click(previewBtn);

    expect(select).toBeDisabled();
    expect(previewBtn).toBeDisabled();

    resolveRun({
      data: {
        success: true,
        report: { dryRun: true, results: { decision: { merges: [] } } },
      },
    });

    await waitFor(() => {
      expect(select).not.toBeDisabled();
    });
  });
});
