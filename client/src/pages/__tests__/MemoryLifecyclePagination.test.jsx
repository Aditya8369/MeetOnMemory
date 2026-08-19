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

const pageOne = {
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
    total: 25,
    page: 1,
    limit: 20,
    totalPages: 2,
    hasMore: true,
  },
};

const pageTwo = {
  success: true,
  memories: [
    {
      _id: "dec-2",
      type: "decision",
      text: "Ship lifecycle pagination for large orgs",
      lifecycleState: "dormant",
      createdAt: "2026-07-01T10:00:00Z",
      lifecycleHistory: [],
    },
  ],
  pagination: {
    total: 25,
    page: 2,
    limit: 20,
    totalPages: 2,
    hasMore: false,
  },
};

describe("MemoryLifecycle pagination (#1552)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    knowledgeApi.getLifecycleMemories.mockResolvedValue({ data: pageOne });
  });

  it("loads the first page from the unified lifecycle endpoint", async () => {
    render(
      <MemoryRouter>
        <MemoryLifecycle />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(knowledgeApi.getLifecycleMemories).toHaveBeenCalled();
    });

    expect(knowledgeApi.getLifecycleMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "all",
        page: 1,
        limit: 20,
      }),
    );

    expect(
      await screen.findByText("Adopt React 18 for client application"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Showing page/i)).toBeInTheDocument();
    expect(screen.getByText(/25 total/i)).toBeInTheDocument();
  });

  it("navigates to the next page using server pagination metadata", async () => {
    knowledgeApi.getLifecycleMemories
      .mockResolvedValueOnce({ data: pageOne })
      .mockResolvedValueOnce({ data: pageTwo });

    render(
      <MemoryRouter>
        <MemoryLifecycle />
      </MemoryRouter>,
    );

    await screen.findByText("Adopt React 18 for client application");

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => {
      expect(knowledgeApi.getLifecycleMemories).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
      );
    });

    expect(
      await screen.findByText("Ship lifecycle pagination for large orgs"),
    ).toBeInTheDocument();
  });

  it("shows empty state when the page has no memories", async () => {
    knowledgeApi.getLifecycleMemories.mockResolvedValue({
      data: {
        success: true,
        memories: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasMore: false,
        },
      },
    });

    render(
      <MemoryRouter>
        <MemoryLifecycle />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No memories found")).toBeInTheDocument();
  });

  it("shows error state with retry when the API fails", async () => {
    knowledgeApi.getLifecycleMemories.mockRejectedValue(new Error("network"));

    render(
      <MemoryRouter>
        <MemoryLifecycle />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Unable to load memories"),
    ).toBeInTheDocument();

    knowledgeApi.getLifecycleMemories.mockResolvedValue({ data: pageOne });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(
      await screen.findByText("Adopt React 18 for client application"),
    ).toBeInTheDocument();
  });

  it("passes lifecycle and search filters to the API", async () => {
    render(
      <MemoryRouter>
        <MemoryLifecycle />
      </MemoryRouter>,
    );

    await screen.findByText("Adopt React 18 for client application");

    fireEvent.click(screen.getByRole("button", { name: /^Archived$/i }));
    fireEvent.change(screen.getByPlaceholderText("Search memory text..."), {
      target: { value: "budget" },
    });

    await waitFor(() => {
      expect(knowledgeApi.getLifecycleMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycleState: "archived",
          search: "budget",
          page: 1,
        }),
      );
    });
  });
});
