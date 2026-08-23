import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MeetingSeriesList from "../MeetingSeriesList.jsx";
import { meetingSeriesApi } from "../../services/meetingSeriesApi.js";

vi.mock("../../services/meetingSeriesApi.js", () => ({
  meetingSeriesApi: {
    listSeries: vi.fn(),
    getSeriesMeetings: vi.fn(),
    cancelSeries: vi.fn(),
    pauseSeries: vi.fn(),
    resumeSeries: vi.fn(),
  },
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("../../hooks/useRBAC.js", () => ({
  useRBAC: () => ({ hasPermission: () => true }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("MeetingSeriesList (#2036)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no series exist", async () => {
    meetingSeriesApi.listSeries.mockResolvedValue({
      data: { success: true, series: [] },
    });

    render(
      <MemoryRouter>
        <MeetingSeriesList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No meeting series yet/i)).toBeInTheDocument();
    });
  });

  it("lists series and opens cancel confirmation", async () => {
    meetingSeriesApi.listSeries.mockResolvedValue({
      data: {
        success: true,
        series: [
          {
            _id: "s1",
            title: "Weekly Sync",
            recurrencePattern: "weekly",
            isActive: true,
            time: "10:00",
            occurrenceCount: 4,
            nextOccurrence: {
              date: "2026-09-01T10:00:00.000Z",
              time: "10:00",
            },
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <MeetingSeriesList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Weekly Sync")).toBeInTheDocument();
      expect(screen.getByText(/Active/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /retrospective/i }),
      ).toHaveAttribute("href", "/meeting-series/s1/retrospective");
    });

    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Cancel meeting series/i)).toBeInTheDocument();
  });
});
