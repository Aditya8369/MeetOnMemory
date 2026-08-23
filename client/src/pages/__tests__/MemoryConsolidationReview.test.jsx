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

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("MemoryConsolidation Cluster Review & Diff Modal (#2041)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders preview merges, cluster checkboxes, and opens diff modal", async () => {
    knowledgeApi.getConsolidationHistory.mockResolvedValue({
      data: { success: true, memories: [] },
    });
    knowledgeApi.runConsolidation.mockResolvedValueOnce({
      data: {
        success: true,
        report: {
          dryRun: true,
          results: {
            decision: {
              recordsScanned: 10,
              clustersFound: 1,
              merges: [
                {
                  canonicalId: "can_1",
                  canonicalText: "Adopt React 19 across frontend packages",
                  mergedIds: ["old_1", "old_2"],
                  aliasesAdded: ["React 19 adoption", "Upgrade frontend React"],
                  conflicts: [],
                },
              ],
            },
          },
        },
      },
    });

    render(
      <BrowserRouter>
        <MemoryConsolidation />
      </BrowserRouter>,
    );

    const previewBtn = screen.getByRole("button", { name: /preview merges/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Adopt React 19 across frontend packages"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("cluster-review-card")).toBeInTheDocument();
      expect(screen.getByTestId("view-diff-button")).toBeInTheDocument();
    });

    // Open diff modal
    fireEvent.click(screen.getByTestId("view-diff-button"));

    expect(screen.getByTestId("diff-modal")).toBeInTheDocument();
    expect(screen.getByText("Cluster Field Diff")).toBeInTheDocument();

    // Close diff modal
    fireEvent.click(screen.getByRole("button", { name: /close diff/i }));
    expect(screen.queryByTestId("diff-modal")).not.toBeInTheDocument();
  });

  it("opens confirmation modal before applying consolidation", async () => {
    knowledgeApi.getConsolidationHistory.mockResolvedValue({
      data: { success: true, memories: [] },
    });

    render(
      <BrowserRouter>
        <MemoryConsolidation />
      </BrowserRouter>,
    );

    const openConfirmBtn = screen.getByTestId("consolidate-open-modal-button");
    fireEvent.click(openConfirmBtn);

    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm Memory Consolidation"),
    ).toBeInTheDocument();
  });
});
