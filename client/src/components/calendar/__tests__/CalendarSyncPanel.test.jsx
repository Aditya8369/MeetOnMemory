import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CalendarSyncPanel from "../CalendarSyncPanel.jsx";
import apiClient from "../../../services/apiClient.js";
import { toast } from "react-toastify";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("CalendarSyncPanel Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and renders calendar status badges in compact mode", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        integrations: [
          { provider: "google", syncStatus: "connected", syncEnabled: true },
          {
            provider: "outlook",
            syncStatus: "disconnected",
            syncEnabled: false,
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <CalendarSyncPanel isCompact />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("calendar-sync-badges")).toBeInTheDocument();
      expect(screen.getByText("Google:")).toBeInTheDocument();
      expect(screen.getByText("Outlook:")).toBeInTheDocument();
      expect(screen.getByText("Manage Sync")).toBeInTheDocument();
    });
  });

  it("triggers resync action and notifies parent on completion", async () => {
    const onSyncComplete = vi.fn();
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        integrations: [
          { provider: "google", syncStatus: "connected", syncEnabled: true },
        ],
      },
    });

    apiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Resynced google calendar",
      },
    });

    render(
      <MemoryRouter>
        <CalendarSyncPanel onSyncComplete={onSyncComplete} isCompact />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Resync Google Calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Resync Google Calendar"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/calendar/resync/google",
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully resynced google calendar",
      );
      expect(onSyncComplete).toHaveBeenCalled();
    });
  });

  it("renders full sync panel with Connect buttons when not compact", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        integrations: [],
      },
    });

    render(
      <MemoryRouter>
        <CalendarSyncPanel />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("calendar-sync-panel")).toBeInTheDocument();
      expect(screen.getByText("Connect Google")).toBeInTheDocument();
      expect(screen.getByText("Connect Outlook")).toBeInTheDocument();
    });
  });
});
