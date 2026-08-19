import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import Leaderboard from "../Leaderboard.jsx";
import apiClient from "../../services/apiClient";

vi.mock("../../services/apiClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("Leaderboard Page (#1799)", () => {
  it("renders Navbar and loading indicator with dark mode classes initially", async () => {
    apiClient.get.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<Leaderboard />);

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();

    const loadingIndicator = screen.getByText("Loading Leaderboard...");
    expect(loadingIndicator).toBeInTheDocument();
    expect(loadingIndicator.className).toContain("text-gray-900");
    expect(loadingIndicator.className).toContain("dark:text-gray-100");
  });

  it("calls apiClient instead of raw axios to fetch leaderboard data", async () => {
    const mockData = {
      success: true,
      data: {
        top10: [
          {
            _id: "user-1",
            user: {
              name: "Alice",
              profilePic: "alice-pic.jpg",
            },
            totalPoints: 120,
          },
        ],
      },
    };

    apiClient.get.mockResolvedValue({ data: mockData });

    render(<Leaderboard />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/gamification/leaderboard",
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("120 pts")).toBeInTheDocument();
    });
  });

  it("handles empty/missing leaderboard data gracefully", async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, data: null } });

    render(<Leaderboard />);

    await waitFor(() => {
      expect(
        screen.getByText("No leaderboard data available."),
      ).toBeInTheDocument();
    });
  });
});
