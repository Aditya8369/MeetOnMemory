import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MemoryLifecycle from "../MemoryLifecycle.jsx";
import { knowledgeApi } from "../../services";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar" />,
}));

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("../../services", () => ({
  knowledgeApi: {
    getLifecycleMemories: vi.fn(),
    runLifecycleSweep: vi.fn(),
    updateMemoryLifecycleState: vi.fn(),
  },
  savedFilterApi: {
    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  },
}));

describe("MemoryLifecycle Modal Accessibility (#1368)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    knowledgeApi.getLifecycleMemories.mockResolvedValue({
      data: {
        success: true,
        memories: [
          {
            _id: "dec-1",
            type: "decision",
            text: "Adopt React 18 for client application",
            lifecycleState: "active",
            createdAt: "2026-08-01T10:00:00Z",
            lifecycleHistory: [],
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasMore: false,
        },
      },
    });
  });

  it("exposes WAI-ARIA dialog attributes when opening state transition modal", async () => {
    render(
      <MemoryRouter>
        <MemoryLifecycle />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Adopt React 18 for client application"),
      ).toBeInTheDocument();
    });

    const archiveButton = screen.getByRole("button", { name: /^archive$/i });
    fireEvent.click(archiveButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "transition-modal-title");
  });
});
