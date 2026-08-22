import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DigestPreferences from "../DigestPreferences";
import apiClient from "../../services/apiClient";
import { toast } from "react-toastify";

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    update: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("../../services/notificationApi.js", () => ({
  notificationApi: {
    getPreferences: vi.fn().mockResolvedValue({ data: { preferences: {} } }),
    updatePreferences: vi.fn(),
  },
}));

describe("DigestPreferences Timezone Context (#1686)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads, displays, and edits timezone context in digest delivery scheduling", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: {
          frequency: "weekly",
          deliveryDay: "Monday",
          deliveryHour: 10,
          timezone: "America/New_York",
          includeSections: ["summaries"],
        },
      },
    });

    apiClient.post.mockResolvedValue({
      data: { html: "<p>Preview</p>" },
    });

    apiClient.put.mockResolvedValueOnce({
      data: { success: true },
    });

    render(<DigestPreferences />);

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery timezone/i)).toBeInTheDocument();
    });

    const tzInput = screen.getByLabelText(/delivery timezone/i);
    expect(tzInput.value).toBe("America/New_York");
    expect(
      screen.getByText(
        /digest deliveries are scheduled and sent according to this timezone \(america\/new_york\)/i,
      ),
    ).toBeInTheDocument();

    // Edit timezone
    fireEvent.change(tzInput, { target: { value: "Europe/London" } });
    expect(tzInput.value).toBe("Europe/London");

    // Click "Save Preferences"
    const saveBtn = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/api/digest-preferences",
        expect.objectContaining({
          timezone: "Europe/London",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Preferences saved successfully!",
      );
    });
  });

  it("detects local timezone when Detect Local button is clicked", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: {
          frequency: "weekly",
          deliveryDay: "Monday",
          deliveryHour: 9,
          timezone: "UTC",
          includeSections: ["summaries"],
        },
      },
    });

    apiClient.post.mockResolvedValue({
      data: { html: "<p>Preview</p>" },
    });

    render(<DigestPreferences />);

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery timezone/i)).toBeInTheDocument();
    });

    const detectBtn = screen.getByRole("button", { name: /detect local/i });
    fireEvent.click(detectBtn);

    const tzInput = screen.getByLabelText(/delivery timezone/i);
    const expectedTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    expect(tzInput.value).toBe(expectedTz);
  });
});
