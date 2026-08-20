import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import ParticipantEngagement from "../ParticipantEngagement.jsx";
import api from "../../services/apiClient";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

vi.mock("../../services/apiClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("ParticipantEngagement Accessibility & Error Handling (#1855)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the shared Navbar and accessible table headers", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("organization/rankings")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              rankings: [
                {
                  _id: "r_1",
                  userId: {
                    _id: "u_1",
                    name: "Alice",
                    email: "alice@example.com",
                  },
                  overallScore: 88,
                  dimensionalScores: {
                    speaking: 80,
                    actionItems: 90,
                    decisions: 85,
                    attendance: 95,
                    aiQuality: 88,
                  },
                },
              ],
            },
          },
        });
      }
      if (url.includes("participant/u_1")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              userId: {
                _id: "u_1",
                name: "Alice",
                email: "alice@example.com",
              },
              overallScore: 88,
              dimensionalScores: {
                speaking: 80,
                actionItems: 90,
                decisions: 85,
                attendance: 95,
                aiQuality: 88,
              },
              historicalTrends: [{ date: "2026-08-10", score: 88 }],
              aiInsights: {
                strengths: ["Clear speaker"],
                growthAreas: ["Action tracking"],
              },
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <BrowserRouter>
        <ParticipantEngagement />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shared-navbar")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Alice" }),
      ).toBeInTheDocument();
    });

    // Check accessible column headers
    const ths = screen.getAllByRole("columnheader");
    expect(ths.length).toBe(5);
    ths.forEach((th) => {
      expect(th).toHaveAttribute("scope", "col");
    });

    // Check accessible landmark regions
    expect(
      screen.getByRole("region", { name: "Participant Overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Organization Rankings Table" }),
    ).toBeInTheDocument();
  });

  it("displays explicit error state on API failure and provides retry action", async () => {
    api.get.mockRejectedValueOnce(new Error("Network Error"));

    render(
      <BrowserRouter>
        <ParticipantEngagement />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("engagement-error-state")).toBeInTheDocument();
      expect(screen.getByText("Failed to Load Dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    });

    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { rankings: [] },
      },
    });

    fireEvent.click(screen.getByTestId("retry-button"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("engagement-error-state"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("No rankings found.")).toBeInTheDocument();
    });
  });

  it("makes rankings table rows clickable, keyboard-accessible, and loads selected user scorecard", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("organization/rankings")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              rankings: [
                {
                  _id: "r_1",
                  userId: {
                    _id: "u_1",
                    name: "Alice",
                    email: "alice@example.com",
                  },
                  overallScore: 88,
                },
                {
                  _id: "r_2",
                  userId: {
                    _id: "u_2",
                    name: "Bob",
                    email: "bob@example.com",
                  },
                  overallScore: 92,
                },
              ],
            },
          },
        });
      }
      if (url.includes("participant/u_1")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              userId: {
                _id: "u_1",
                name: "Alice",
                email: "alice@example.com",
              },
              overallScore: 88,
              dimensionalScores: { speaking: 80 },
              historicalTrends: [],
              aiInsights: {},
            },
          },
        });
      }
      if (url.includes("participant/u_2")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              userId: {
                _id: "u_2",
                name: "Bob",
                email: "bob@example.com",
              },
              overallScore: 92,
              dimensionalScores: { speaking: 90 },
              historicalTrends: [],
              aiInsights: {},
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <BrowserRouter>
        <ParticipantEngagement />
      </BrowserRouter>,
    );

    // Initial scorecard is loaded for Alice
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Alice" }),
      ).toBeInTheDocument();
    });

    // Check Bob row exists and has accessibility roles/attributes
    const bobRow = screen.getByRole("button", {
      name: "View scorecard for Bob",
    });
    expect(bobRow).toBeInTheDocument();
    expect(bobRow).toHaveAttribute("tabIndex", "0");
    expect(bobRow).toHaveAttribute("aria-current", "false");

    // Click Bob's row
    fireEvent.click(bobRow);

    // Verify Bob's scorecard is loaded
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Bob" })).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Alice" }),
      ).not.toBeInTheDocument();
      expect(bobRow).toHaveAttribute("aria-current", "true");
    });
  });
});
