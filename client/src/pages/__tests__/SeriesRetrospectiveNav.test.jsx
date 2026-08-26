import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";
import SeriesRetrospective from "../SeriesRetrospective.jsx";
import * as api from "../../services/seriesRetrospectiveApi";

vi.mock("../../services/seriesRetrospectiveApi", () => ({
  getSeriesRetrospectiveOverview: vi.fn(),
  getSeriesRetrospectiveTopics: vi.fn(),
  getSeriesRetrospectiveActionItems: vi.fn(),
  getSeriesRetrospectiveAttendance: vi.fn(),
  getSeriesRetrospectiveSentiment: vi.fn(),
  getSeriesRetrospectiveDecisions: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("SeriesRetrospective empty/error UI (#2005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows insufficient-history empty state", async () => {
    api.getSeriesRetrospectiveOverview.mockResolvedValue({
      success: true,
      summary:
        "This series needs more meeting history for a useful retrospective.",
      metricsData: { totalMeetings: 1 },
      insufficientHistory: true,
    });

    render(
      <MemoryRouter initialEntries={["/meeting-series/s1/retrospective"]}>
        <Routes>
          <Route
            path="/meeting-series/:seriesId/retrospective"
            element={<SeriesRetrospective />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/needs more meeting history/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /back to series list/i }),
      ).toHaveAttribute("href", "/meeting-series");
    });
  });

  it("shows error UI when overview request fails", async () => {
    api.getSeriesRetrospectiveOverview.mockRejectedValue({
      response: { data: { message: "Meeting series not found" } },
    });

    render(
      <MemoryRouter initialEntries={["/meeting-series/missing/retrospective"]}>
        <Routes>
          <Route
            path="/meeting-series/:seriesId/retrospective"
            element={<SeriesRetrospective />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Could not load retrospective/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Meeting series not found/i)).toBeInTheDocument();
    });
  });
});
