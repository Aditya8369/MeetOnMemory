import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import AutomationRules from "../AutomationRules.jsx";
import * as api from "../../services/automationRuleApi";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

vi.mock("../../services/automationRuleApi", () => ({
  fetchRules: vi.fn(),
  fetchRuleById: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  toggleRuleStatus: vi.fn(),
  deleteRule: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AutomationRules Edit Flow (#2014)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRules = [
    {
      _id: "rule_1",
      name: "Slack Notify On Meeting",
      description: "Send alert to #general",
      isActive: true,
      trigger: { event: "meeting.created", filters: { tag: "eng" } },
      actions: [{ type: "slack", config: { channelId: "C12345" } }],
    },
  ];

  it("opens edit mode with pre-populated values and updates rule via updateRule API", async () => {
    api.fetchRules.mockResolvedValue(mockRules);
    api.updateRule.mockResolvedValue({
      ...mockRules[0],
      name: "Updated Slack Notify",
      description: "Updated description",
    });

    render(
      <BrowserRouter>
        <AutomationRules />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Slack Notify On Meeting")).toBeInTheDocument();
      expect(screen.getByText("Send alert to #general")).toBeInTheDocument();
    });

    // Click Edit button
    fireEvent.click(
      screen.getByRole("button", { name: "Edit rule Slack Notify On Meeting" }),
    );

    expect(
      screen.getByRole("region", { name: "Edit Automation Rule" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("rule-name-input")).toHaveValue(
      "Slack Notify On Meeting",
    );
    expect(screen.getByTestId("rule-description-input")).toHaveValue(
      "Send alert to #general",
    );

    // Modify values
    fireEvent.change(screen.getByTestId("rule-name-input"), {
      target: { value: "Updated Slack Notify" },
    });
    fireEvent.change(screen.getByTestId("rule-description-input"), {
      target: { value: "Updated description" },
    });

    // Submit update
    fireEvent.click(screen.getByTestId("save-rule-button"));

    await waitFor(() => {
      expect(api.updateRule).toHaveBeenCalledWith("rule_1", {
        name: "Updated Slack Notify",
        description: "Updated description",
        trigger: { event: "meeting.created", filters: { tag: "eng" } },
        actions: [{ type: "slack", config: { channelId: "C12345" } }],
      });
    });
  });
});
