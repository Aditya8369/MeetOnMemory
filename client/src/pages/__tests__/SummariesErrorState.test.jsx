import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Summaries from "../Summaries.jsx";
import { meetingApi } from "../../services";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("../../hooks/useExport.js", () => ({
  default: () => ({ exportMeeting: vi.fn(), isExporting: false }),
}));

vi.mock("../../services", () => ({
  meetingApi: {
    getAllMeetings: vi.fn(),
    deleteMeeting: vi.fn(),
  },
}));

describe("Summaries API Error and Retry State (#1641)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays dedicated error state on API failure (not empty state) and allows retry", async () => {
    // First call rejects with 500 error
    meetingApi.getAllMeetings.mockRejectedValueOnce(
      new Error("Internal Server Error"),
    );

    render(
      <BrowserRouter>
        <Summaries />
      </BrowserRouter>,
    );

    // Should display error state with Retry button
    await waitFor(() => {
      expect(screen.getByTestId("summaries-error-state")).toBeInTheDocument();
      expect(screen.getByText("Failed to Load Summaries")).toBeInTheDocument();
      expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    });

    // Should NOT display the normal empty state
    expect(
      screen.queryByTestId("summaries-empty-state"),
    ).not.toBeInTheDocument();

    // Setup second call to succeed on retry
    meetingApi.getAllMeetings.mockResolvedValueOnce({
      data: {
        success: true,
        meetings: [
          {
            _id: "m_1",
            title: "Sprint Review",
            createdAt: new Date().toISOString(),
            summary: "Sprint 42 completed on schedule",
          },
        ],
        pagination: { total: 1, page: 1, limit: 9, totalPages: 1 },
      },
    });

    // Click Retry
    fireEvent.click(screen.getByTestId("retry-button"));

    // Should now render the summary card and clear error state
    await waitFor(() => {
      expect(screen.getByText("Sprint Review")).toBeInTheDocument();
      expect(
        screen.queryByTestId("summaries-error-state"),
      ).not.toBeInTheDocument();
    });
  });

  it("displays legitimate empty state when API succeeds with no summaries", async () => {
    meetingApi.getAllMeetings.mockResolvedValueOnce({
      data: {
        success: true,
        meetings: [],
        pagination: { total: 0, page: 1, limit: 9, totalPages: 0 },
      },
    });

    render(
      <BrowserRouter>
        <Summaries />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("summaries-empty-state")).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("summaries-error-state"),
    ).not.toBeInTheDocument();
  });
});
