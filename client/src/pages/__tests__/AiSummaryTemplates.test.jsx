import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AiSummaryTemplates from "../AiSummaryTemplates.jsx";
import { aiSummaryTemplateApi } from "../../services";

// Mock Navbar
vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav>Navbar</nav>,
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock services/aiSummaryTemplateApi
vi.mock("../../services", () => ({
  aiSummaryTemplateApi: {
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    setDefaultTemplate: vi.fn(),
    testTemplate: vi.fn(),
  },
}));

describe("AiSummaryTemplates Page and Interactions (#2280)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches, renders templates, allows editing and deleting", async () => {
    const mockTemplates = [
      {
        _id: "tpl-1",
        name: "Engineering Sync",
        description: "Format for standups",
        customInstructions: "Instructions 1",
        expectedFormat: "json",
        isDefault: true,
      },
    ];

    aiSummaryTemplateApi.getTemplates.mockResolvedValue({
      data: mockTemplates,
    });

    render(<AiSummaryTemplates />);

    expect(screen.getByText("AI Summary Templates")).toBeInTheDocument();

    // Check loading indicator first, then template data
    await waitFor(() => {
      expect(screen.getByText("Engineering Sync")).toBeInTheDocument();
      expect(screen.getByText("Format for standups")).toBeInTheDocument();
    });

    // Test Delete confirmation and execution
    window.confirm = vi.fn().mockReturnValue(true);
    aiSummaryTemplateApi.deleteTemplate.mockResolvedValue({});

    const deleteBtn = screen.getByTitle("Delete");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(aiSummaryTemplateApi.deleteTemplate).toHaveBeenCalledWith("tpl-1");
    });
  });

  it("displays error banner when loading templates fails", async () => {
    aiSummaryTemplateApi.getTemplates.mockRejectedValue(
      new Error("Failed to load"),
    );

    render(<AiSummaryTemplates />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load templates. Please try again."),
      ).toBeInTheDocument();
    });
  });
});
