import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ActionItemsDashboard from "../ActionItemsDashboard.jsx";
import api from "../../services/apiClient.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("ActionItemsDashboard Page (#1874)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Navbar and fetches action items with /api/action-items", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            _id: "task-1",
            title: "Prepare presentation",
            priority: "high",
            status: "pending",
            assignee: { name: "Sarah", avatar: "" },
          },
        ],
      },
    });

    render(<ActionItemsDashboard />);

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
    expect(screen.getByText("My Action Items")).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/action-items");
      expect(screen.getByText("Prepare presentation")).toBeInTheDocument();
    });
  });

  it("renders all kanban status columns", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [],
      },
    });

    render(<ActionItemsDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText("To Do")[0]).toBeInTheDocument();
      expect(screen.getAllByText("In Progress")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Done")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Overdue")[0]).toBeInTheDocument();
    });
  });
});
