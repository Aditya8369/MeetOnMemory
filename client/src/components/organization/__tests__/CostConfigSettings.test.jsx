import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CostConfigSettings from "../CostConfigSettings.jsx";
import {
  getCostConfig,
  updateCostConfig,
} from "../../../services/meetingCostApi.js";

vi.mock("../../../services/meetingCostApi.js", () => ({
  getCostConfig: vi.fn(),
  updateCostConfig: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("CostConfigSettings Component (#2035)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cost config with default rate and existing member overrides", async () => {
    getCostConfig.mockResolvedValueOnce({
      success: true,
      config: {
        currency: "USD",
        defaultHourlyRate: 75,
        memberRateOverrides: [
          {
            user: "dev@example.com",
            email: "dev@example.com",
            hourlyRate: 120,
          },
        ],
      },
    });

    render(<CostConfigSettings canEdit={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", {
          name: "Meeting Cost Configuration Panel",
        }),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("75")).toBeInTheDocument();
      expect(screen.getByText("dev@example.com")).toBeInTheDocument();
      expect(screen.getByText("USD 120/hr")).toBeInTheDocument();
    });
  });

  it("allows adding member override and saving updated config", async () => {
    getCostConfig.mockResolvedValueOnce({
      success: true,
      config: {
        currency: "USD",
        defaultHourlyRate: 50,
        memberRateOverrides: [],
      },
    });
    updateCostConfig.mockResolvedValueOnce({
      success: true,
    });

    render(<CostConfigSettings canEdit={true} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("override-member-email-input"),
      ).toBeInTheDocument();
    });

    // Add member override
    fireEvent.change(screen.getByTestId("override-member-email-input"), {
      target: { value: "lead@example.com" },
    });
    fireEvent.change(screen.getByTestId("override-member-rate-input"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByTestId("add-override-button"));

    expect(screen.getByText("lead@example.com")).toBeInTheDocument();
    expect(screen.getByText("USD 150/hr")).toBeInTheDocument();

    // Save changes
    fireEvent.click(screen.getByTestId("save-cost-config-button"));

    await waitFor(() => {
      expect(updateCostConfig).toHaveBeenCalledWith({
        currency: "USD",
        defaultHourlyRate: 50,
        memberRateOverrides: [
          {
            user: "lead@example.com",
            email: "lead@example.com",
            hourlyRate: 150,
          },
        ],
      });
    });
  });
});
