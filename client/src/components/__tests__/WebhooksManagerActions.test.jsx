import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WebhooksManager from "../WebhooksManager.jsx";
import { webhookApi } from "../../services/webhookApi.js";

// Mock webhookApi
vi.mock("../../services/webhookApi.js", () => ({
  webhookApi: {
    getWebhooks: vi.fn(),
    rotateSecret: vi.fn(),
    ping: vi.fn(),
  },
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("WebhooksManager Secret Rotation and Ping UI (#2070)", () => {
  const orgId = "org_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles secret rotation and test ping interactions successfully", async () => {
    webhookApi.getWebhooks.mockResolvedValue({
      data: {
        success: true,
        webhooks: [
          {
            _id: "wh_1",
            targetUrl: "https://test.receiver.com",
            events: ["meeting.created"],
            isActive: true,
            healthStatus: "healthy",
          },
        ],
      },
    });

    render(<WebhooksManager organizationId={orgId} />);

    // Wait for card to render
    await waitFor(() => {
      expect(screen.getByText("https://test.receiver.com")).toBeInTheDocument();
    });

    const rotateBtn = screen.getByTitle("Rotate Webhook Secret");
    const pingBtn = screen.getByTitle("Send Test Ping");

    expect(rotateBtn).toBeInTheDocument();
    expect(pingBtn).toBeInTheDocument();

    // 1. Rotate Secret Test
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    webhookApi.rotateSecret.mockResolvedValue({
      data: {
        success: true,
        secret: "super-new-rotated-secret-key-123",
      },
    });

    fireEvent.click(rotateBtn);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(webhookApi.rotateSecret).toHaveBeenCalledWith("wh_1");
      expect(
        screen.getByText("New Webhook Secret Generated"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("super-new-rotated-secret-key-123"),
      ).toBeInTheDocument();
    });

    // 2. Test Ping Trigger
    webhookApi.ping.mockResolvedValue({
      data: {
        success: true,
        delivery: { status: "delivered", responseStatus: 200 },
      },
    });

    fireEvent.click(pingBtn);

    await waitFor(() => {
      expect(webhookApi.ping).toHaveBeenCalledWith("wh_1");
    });
  });
});
