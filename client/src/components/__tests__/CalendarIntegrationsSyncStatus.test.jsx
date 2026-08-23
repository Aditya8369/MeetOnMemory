import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CalendarIntegrations from "../CalendarIntegrations.jsx";
import apiClient from "../../services/apiClient.js";
import { toast } from "react-toastify";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("CalendarIntegrations Sync now (#2053)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers Sync now and shows success result + updated lastSyncedAt", async () => {
    const syncedAt = "2026-08-23T10:00:00.000Z";
    apiClient.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          integrations: [
            {
              provider: "google",
              syncEnabled: true,
              syncStatus: "connected",
              lastSyncedAt: "2026-08-01T12:00:00.000Z",
              syncHistory: [],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          integrations: [
            {
              provider: "google",
              syncEnabled: true,
              syncStatus: "connected",
              lastSyncedAt: syncedAt,
              lastResult: {
                status: "success",
                message: "Synced 2 event(s) successfully.",
                at: syncedAt,
              },
              syncHistory: [
                {
                  status: "success",
                  message: "Synced 2 event(s) successfully.",
                  at: syncedAt,
                  trigger: "manual",
                },
              ],
            },
          ],
        },
      });

    apiClient.post.mockResolvedValue({
      data: {
        success: true,
        message: "Synced 2 event(s) successfully",
        connection: {
          lastSyncedAt: syncedAt,
          lastResult: {
            status: "success",
            message: "Synced 2 event(s) successfully.",
            at: syncedAt,
          },
        },
      },
    });

    render(<CalendarIntegrations />);

    await waitFor(() => {
      expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/calendar/resync/google",
      );
      expect(toast.success).toHaveBeenCalled();
      expect(
        screen.getAllByText(/Synced 2 event\(s\) successfully/i).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(/Recent sync attempts/i)).toBeInTheDocument();
      expect(screen.getByText(/Last synced:/i)).toBeInTheDocument();
    });
  });

  it("shows actionable error and Reconnect when needs_reauth", async () => {
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        integrations: [
          {
            provider: "google",
            syncEnabled: true,
            syncStatus: "needs_reauth",
            lastSyncedAt: "2026-08-01T12:00:00.000Z",
            syncError:
              "Calendar access expired. Reconnect the provider and try Sync now again.",
            lastResult: {
              status: "error",
              message:
                "Calendar access expired. Reconnect the provider and try Sync now again.",
            },
            syncHistory: [
              {
                status: "error",
                message:
                  "Calendar access expired. Reconnect the provider and try Sync now again.",
                at: "2026-08-02T12:00:00.000Z",
              },
            ],
          },
        ],
      },
    });

    render(<CalendarIntegrations />);

    await waitFor(() => {
      expect(screen.getByText(/Needs Re-auth/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reconnect/i }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/Calendar access expired/i).length,
      ).toBeGreaterThan(0);
    });
  });
});
