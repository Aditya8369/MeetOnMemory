import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SharedQuietHours from "../SharedQuietHours.jsx";
import { notificationApi } from "../../services/notificationApi.js";

// Mock notificationApi
vi.mock("../../services/notificationApi.js", () => ({
  notificationApi: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("SharedQuietHours Component (#2065)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with loaded settings and updates on input change", async () => {
    notificationApi.getPreferences.mockResolvedValue({
      data: {
        preferences: {
          quietHoursStart: 22,
          quietHoursEnd: 6,
          timezone: "UTC",
        },
      },
    });

    render(<SharedQuietHours onQuietHoursChange={vi.fn()} />);

    // Wait for data load
    await waitFor(() => {
      expect(
        screen.getByText("Unified Quiet Hours Settings"),
      ).toBeInTheDocument();
    });

    const startSelect = screen.getByLabelText("Start Time");
    const endSelect = screen.getByLabelText("End Time");
    const tzInput = screen.getByLabelText("Timezone (Explicit)");

    expect(startSelect.value).toBe("22");
    expect(endSelect.value).toBe("6");
    expect(tzInput.value).toBe("UTC");

    // Change start time selection
    fireEvent.change(startSelect, { target: { value: "20" } });

    await waitFor(() => {
      expect(notificationApi.updatePreferences).toHaveBeenCalledWith({
        quietHoursStart: 20,
        quietHoursEnd: 6,
        timezone: "UTC",
      });
    });
  });
});
