import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import TopicExplorer from "../TopicExplorer.jsx";
import apiClient from "../../services/apiClient.js";
import AppContent from "../../context/AppContent.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("TopicExplorer Accessibility & Error Handling (#1962)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserContext = {
    userData: {
      _id: "u_1",
      organization: "org_123",
    },
  };

  it("renders Navbar and accessible ARIA regions when data loads", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            _id: "c_1",
            label: "Sprint Planning",
            meetingCount: 5,
            canonicalTopicNames: ["Sprint Goals", "Backlog"],
          },
        ],
      },
    });

    render(
      <BrowserRouter>
        <AppContent.Provider value={mockUserContext}>
          <TopicExplorer />
        </AppContent.Provider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shared-navbar")).toBeInTheDocument();
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("region", { name: "Topic Clusters Overview Chart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Topic Clusters Grid" }),
    ).toBeInTheDocument();
  });

  it("displays dedicated error state on API failure and retries successfully", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("API Error"));

    render(
      <BrowserRouter>
        <AppContent.Provider value={mockUserContext}>
          <TopicExplorer />
        </AppContent.Provider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("topic-error-state")).toBeInTheDocument();
      expect(screen.getByText("Failed to Load Topics")).toBeInTheDocument();
      expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    });

    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
      },
    });

    fireEvent.click(screen.getByTestId("retry-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("topic-error-state")).not.toBeInTheDocument();
      expect(screen.getByText("No topic clusters found.")).toBeInTheDocument();
    });
  });
});
