import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AutomationRules from "../AutomationRules.jsx";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../services/automationRuleApi.js", () => ({
  fetchRules: vi.fn().mockResolvedValue([]),
  toggleRuleStatus: vi.fn(),
  deleteRule: vi.fn(),
  createRule: vi.fn(),
}));

describe("AutomationRules Navbar integration smoke test (#1652)", () => {
  it("renders the shared Navbar component on the Automation Rules page", async () => {
    render(<AutomationRules />);
    const navbar = await screen.findByTestId("mock-navbar");
    expect(navbar).toBeInTheDocument();
  });
});
