import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AutomationRules from "../AutomationRules.jsx";
import * as api from "../../services/automationRuleApi.js";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../services/automationRuleApi.js", () => ({
  fetchRules: vi.fn(),
  toggleRuleStatus: vi.fn(),
  deleteRule: vi.fn(),
  createRule: vi.fn(),
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

describe("AutomationRules Dark Mode (#1371)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page container with dark-mode background and text classes", async () => {
    api.fetchRules.mockResolvedValue([]);

    const { container } = render(<AutomationRules />);

    await waitFor(() => {
      expect(screen.getByText(/no automation rules yet/i)).toBeInTheDocument();
    });

    const root = container.firstChild;
    expect(root.className).toContain("dark:bg-gray-900");
    expect(root.className).toContain("dark:text-gray-100");
    expect(root.className).toContain("bg-gray-50");
  });

  it("renders empty-state card with dark-mode surface classes", async () => {
    api.fetchRules.mockResolvedValue([]);

    render(<AutomationRules />);

    await waitFor(() => {
      expect(screen.getByText(/no automation rules yet/i)).toBeInTheDocument();
    });

    const emptyTitle = screen.getByText(/no automation rules yet/i);
    const emptyCard = emptyTitle.closest("div.rounded-xl");
    expect(emptyCard.className).toContain("dark:bg-gray-800");
    expect(emptyCard.className).toContain("dark:border-gray-700");
    expect(emptyTitle.className).toContain("dark:text-white");
  });

  it("renders rule cards with dark-mode classes", async () => {
    api.fetchRules.mockResolvedValue([
      {
        _id: "rule-1",
        name: "Notify Slack on meeting creation",
        description: "Posts to #general",
        isActive: true,
        trigger: { event: "meeting.created" },
        actions: [{ type: "slack" }],
      },
      {
        _id: "rule-2",
        name: "Disabled webhook rule",
        isActive: false,
        trigger: { event: "transcript.processed" },
        actions: [{ type: "webhook" }],
      },
    ]);

    render(<AutomationRules />);

    await waitFor(() => {
      expect(
        screen.getByText("Notify Slack on meeting creation"),
      ).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("automation-rule-card");
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card.className).toContain("dark:bg-gray-800");
      expect(card.className).toContain("dark:border-gray-700");
    });

    const activeBadge = screen.getByText("Active");
    expect(activeBadge.className).toContain("dark:bg-green-900/30");
    expect(activeBadge.className).toContain("dark:text-green-400");

    const disabledBadge = screen.getByText("Disabled");
    expect(disabledBadge.className).toContain("dark:bg-gray-700");
    expect(disabledBadge.className).toContain("dark:text-gray-300");
  });

  it("renders builder form inputs and buttons with dark-mode classes", async () => {
    api.fetchRules.mockResolvedValue([]);

    render(<AutomationRules />);

    await waitFor(() => {
      expect(screen.getByText(/no automation rules yet/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /new rule/i }));

    expect(screen.getByText(/create new rule/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(
      /notify slack on new meeting/i,
    );
    expect(nameInput.className).toContain("dark:bg-gray-700");
    expect(nameInput.className).toContain("dark:border-gray-600");
    expect(nameInput.className).toContain("dark:text-white");
    expect(nameInput.className).toContain("dark:placeholder-gray-400");

    const eventSelect = screen.getByDisplayValue("Meeting Created");
    expect(eventSelect.className).toContain("dark:bg-gray-700");
    expect(eventSelect.className).toContain("dark:text-white");

    const cancelButtons = screen.getAllByRole("button", { name: /^cancel$/i });
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    const formCancel = cancelButtons.find((btn) =>
      btn.className.includes("dark:border-gray-600"),
    );
    expect(formCancel).toBeTruthy();
    expect(formCancel.className).toContain("dark:text-gray-300");
    expect(formCancel.className).toContain("dark:hover:bg-gray-700");

    const saveButton = screen.getByRole("button", { name: /save rule/i });
    expect(saveButton.className).toContain("dark:bg-indigo-500");
    expect(saveButton.className).toContain("dark:hover:bg-indigo-600");
  });

  it("renders action and delete controls with dark-mode hover classes", async () => {
    api.fetchRules.mockResolvedValue([
      {
        _id: "rule-1",
        name: "Notify Slack on meeting creation",
        isActive: true,
        trigger: { event: "meeting.created" },
        actions: [{ type: "slack" }],
      },
    ]);

    render(<AutomationRules />);

    await waitFor(() => {
      expect(
        screen.getByText("Notify Slack on meeting creation"),
      ).toBeInTheDocument();
    });

    const toggle = screen.getByTitle("Disable Rule");
    expect(toggle.className).toContain("dark:text-green-400");
    expect(toggle.className).toContain("dark:hover:bg-green-900/20");

    const deleteButton = screen.getByTitle("Delete Rule");
    expect(deleteButton.className).toContain("dark:text-red-400");
    expect(deleteButton.className).toContain("dark:hover:bg-red-900/20");
  });
});
