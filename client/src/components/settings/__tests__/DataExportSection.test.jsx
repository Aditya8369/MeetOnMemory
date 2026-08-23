import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DataExportSection from "../DataExportSection.jsx";
import { userApi } from "../../../services/userApi.js";

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock userApi
vi.mock("../../../services/userApi.js", () => ({
  userApi: {
    getDataExportStatus: vi.fn(),
    requestDataExport: vi.fn(),
    downloadExport: vi.fn(),
  },
}));

describe("DataExportSection (#2033)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders idle state with explanation and Request Export button enabled", async () => {
    userApi.getDataExportStatus.mockResolvedValue({
      data: {
        success: true,
        data: {
          status: "idle",
          canRequest: true,
          cooldownRemainingMs: 0,
          cooldownHoursRemaining: 0,
          downloadUrl: null,
          expiresAt: null,
          error: null,
        },
      },
    });

    render(<DataExportSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Data Portability & Privacy (GDPR)"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("What is included in your export package?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Account Profile")).toBeInTheDocument();
    expect(screen.getByText("Meeting History")).toBeInTheDocument();
    expect(screen.getByText("Team Memberships")).toBeInTheDocument();

    const requestBtn = screen.getByTestId("request-export-btn");
    expect(requestBtn).toBeEnabled();
    expect(requestBtn).toHaveTextContent("Request Data Export");
  });

  it("opens ConfirmModal and submits export request", async () => {
    userApi.getDataExportStatus.mockResolvedValue({
      data: {
        success: true,
        data: {
          status: "idle",
          canRequest: true,
          cooldownRemainingMs: 0,
          downloadUrl: null,
        },
      },
    });
    userApi.requestDataExport.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Data export request accepted.",
      },
    });

    render(<DataExportSection />);

    await waitFor(() => {
      expect(screen.getByTestId("request-export-btn")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("request-export-btn"));

    // ConfirmModal should appear
    await waitFor(() => {
      expect(
        screen.getByText("Request Personal Data Export"),
      ).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", {
      name: /^Request Export$/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(userApi.requestDataExport).toHaveBeenCalled();
    });
  });

  it("renders processing state when export is currently building", async () => {
    userApi.getDataExportStatus.mockResolvedValue({
      data: {
        success: true,
        data: {
          status: "processing",
          canRequest: false,
          cooldownRemainingMs: 0,
          downloadUrl: null,
        },
      },
    });

    render(<DataExportSection />);

    await waitFor(() => {
      expect(screen.getByTestId("export-processing-state")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Preparing Data Export Archive..."),
    ).toBeInTheDocument();

    const requestBtn = screen.getByTestId("request-export-btn");
    expect(requestBtn).toBeDisabled();
    expect(requestBtn).toHaveTextContent("Compiling...");
  });

  it("renders completed state with active download button", async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { assign: vi.fn() };

    userApi.getDataExportStatus.mockResolvedValue({
      data: {
        success: true,
        data: {
          status: "completed",
          canRequest: false,
          cooldownRemainingMs: 12 * 60 * 60 * 1000,
          cooldownHoursRemaining: 12,
          downloadUrl: "/api/user/download-export/token123",
          expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
        },
      },
    });

    render(<DataExportSection />);

    await waitFor(() => {
      expect(screen.getByTestId("export-completed-state")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Your Data Package is Ready for Download"),
    ).toBeInTheDocument();

    const downloadBtn = screen.getByTestId("download-export-btn");
    expect(downloadBtn).toBeInTheDocument();
    fireEvent.click(downloadBtn);

    expect(window.location.assign).toHaveBeenCalledWith(
      "/api/user/download-export/token123",
    );

    window.location = originalLocation;
  });

  it("renders rate limit notice when export was recently requested", async () => {
    userApi.getDataExportStatus.mockResolvedValue({
      data: {
        success: true,
        data: {
          status: "idle",
          canRequest: false,
          cooldownRemainingMs: 18 * 60 * 60 * 1000,
          cooldownHoursRemaining: 18,
          downloadUrl: null,
        },
      },
    });

    render(<DataExportSection />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Next export request available in approximately 18 hour(s).",
        ),
      ).toBeInTheDocument();
    });

    const requestBtn = screen.getByTestId("request-export-btn");
    expect(requestBtn).toBeDisabled();
  });

  it("renders error state when export generation fails", async () => {
    userApi.getDataExportStatus.mockResolvedValue({
      data: {
        success: true,
        data: {
          status: "failed",
          canRequest: true,
          cooldownRemainingMs: 0,
          error: "Database connection timeout during archive compilation",
        },
      },
    });

    render(<DataExportSection />);

    await waitFor(() => {
      expect(screen.getByTestId("export-failed-state")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Database connection timeout during archive compilation",
      ),
    ).toBeInTheDocument();
  });
});
