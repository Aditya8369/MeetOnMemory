import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import DuplicateDetectionPanel from "../DuplicateDetectionPanel.jsx";
import { meetingDuplicateApi } from "../../../api/meetingDuplicateApi.js";
import apiClient from "../../../services/apiClient.js";

vi.mock("../../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DuplicateDetectionPanel & useMeetingDuplicates (#1895)", () => {
  let originalReload;
  let reloadMock;

  beforeEach(() => {
    vi.clearAllMocks();
    originalReload = window.location.reload;
    reloadMock = vi.fn();
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      value: reloadMock,
    });
  });

  afterEach(() => {
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      value: originalReload,
    });
  });

  it("meetingDuplicateApi uses apiClient", async () => {
    apiClient.get.mockResolvedValue({ data: { duplicates: [] } });
    await meetingDuplicateApi.detectDuplicates("meeting-123");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/meetings/meeting-123/duplicates",
    );

    apiClient.post.mockResolvedValue({ data: { success: true } });
    await meetingDuplicateApi.mergeMeetings("meeting-123", "meeting-456");
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/meetings/meeting-123/duplicates/merge",
      {
        secondaryId: "meeting-456",
      },
    );

    await meetingDuplicateApi.dismissDuplicate("meeting-123", "meeting-456");
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/meetings/meeting-123/duplicates",
      {
        secondaryId: "meeting-456",
      },
    );
  });

  it("renders duplicates list and handles merge in-place without page reload", async () => {
    const mockDuplicates = [
      {
        _id: "dup-1",
        title: "Duplicate Meeting",
        date: "2026-08-01T10:00:00.000Z",
        similarity: 0.85,
      },
    ];

    apiClient.get.mockResolvedValue({ data: { duplicates: mockDuplicates } });
    apiClient.post.mockResolvedValue({ data: { success: true } });

    render(<DuplicateDetectionPanel meetingId="meeting-123" />);

    // Wait for render
    await waitFor(() => {
      expect(screen.getByText("Duplicate Meeting")).toBeInTheDocument();
      expect(screen.getByText("Similarity: 85%")).toBeInTheDocument();
    });

    // Click Merge Data
    fireEvent.click(screen.getByText("Merge Data"));

    // Click Confirm Merge
    fireEvent.click(screen.getByText("Yes, Merge Meetings"));

    // Verify API called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/meetings/meeting-123/duplicates/merge",
        {
          secondaryId: "dup-1",
        },
      );
    });

    // Verify window.location.reload was NOT called
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
