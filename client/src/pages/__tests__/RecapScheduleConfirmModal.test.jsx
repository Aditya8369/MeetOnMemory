import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RecapScheduleDashboard from "../RecapScheduleDashboard.jsx";
import { recapScheduleApi } from "../../services/recapScheduleApi";
import AppContent from "../../context/AppContent";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("../../services/recapScheduleApi", () => ({
  recapScheduleApi: {
    getSchedule: vi.fn(),
    getDeliveryHistory: vi.fn(),
    upsertSchedule: vi.fn(),
    retryDelivery: vi.fn(),
  },
}));

describe("RecapSchedule Confirm Modal (#1612)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens ConfirmModal when retry button is clicked and executes retry on confirm", async () => {
    recapScheduleApi.getSchedule.mockResolvedValue({
      data: { scheduleType: "daily" },
    });
    recapScheduleApi.getDeliveryHistory.mockResolvedValue({
      data: [
        {
          _id: "del-123",
          meetingId: { title: "Q3 Planning Sync" },
          deliveredAt: "2026-08-10T12:00:00.000Z",
          status: "delivered",
        },
      ],
    });
    recapScheduleApi.retryDelivery.mockResolvedValue({ success: true });

    render(
      <AppContent.Provider value={{ userData: { organization: "org-1" } }}>
        <RecapScheduleDashboard />
      </AppContent.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Q3 Planning Sync")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", {
      name: /retry delivery for q3 planning sync/i,
    });
    fireEvent.click(retryButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/retry recap delivery/i)).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", {
      name: /retry delivery/i,
    });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(recapScheduleApi.retryDelivery).toHaveBeenCalledWith("del-123");
    });
  });
});
