import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Badges from "../Badges.jsx";
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
  toast: { error: vi.fn() },
}));

describe("Badges gallery page (#2066)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders earned and locked badges with progress", async () => {
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          totalPoints: 40,
          summary: { total: 2, earnedCount: 1, lockedCount: 1 },
          inProgress: [
            {
              id: "b2",
              name: "Action Assassin",
              description: "Reach 100 pts",
              tier: "Gold",
              earned: false,
              progress: { current: 40, target: 100, percent: 40 },
            },
          ],
          earned: [
            {
              id: "b1",
              name: "First Steps",
              description: "Join an org",
              tier: "Bronze",
              earned: true,
              unlockedAt: "2026-01-01",
              progress: { current: 40, target: 10, percent: 100 },
            },
          ],
          locked: [
            {
              id: "b2",
              name: "Action Assassin",
              description: "Reach 100 pts",
              tier: "Gold",
              earned: false,
              progress: { current: 40, target: 100, percent: 40 },
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <Badges />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/gamification/badges");
      expect(screen.getByText("First Steps")).toBeInTheDocument();
      expect(screen.getByText("Action Assassin")).toBeInTheDocument();
      expect(screen.getByText("40 / 100 pts")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /view leaderboard/i }),
      ).toHaveAttribute("href", "/leaderboard");
    });
  });
});
