import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportBuilder from "../ReportBuilder.jsx";
import reportApi from "../../services/reportApi.js";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ templateId: "test-tpl-123" }),
  };
});

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) => children({ provided: {}, placeholder: null }),
  Draggable: ({ children }) => children({ provided: {} }),
}));

vi.mock("../../services/reportApi.js", () => ({
  default: {
    getTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    generateReport: vi.fn(),
  },
}));

describe("ReportBuilder Shell, Loading, and Accessibility (#1653)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Navbar and structured loading state when fetching a template", async () => {
    let resolveTemplate;
    reportApi.getTemplateById.mockReturnValue(
      new Promise((res) => {
        resolveTemplate = res;
      }),
    );

    render(
      <MemoryRouter>
        <ReportBuilder />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
    expect(screen.getByText("Loading report template...")).toBeInTheDocument();

    resolveTemplate({
      data: {
        _id: "test-tpl-123",
        name: "Weekly Sync Report",
        description: "Weekly executive summary",
        sections: [],
        defaultFilters: { dateRangeDays: 30, tags: [], meetingTypes: [] },
        isShared: false,
      },
    });

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Weekly Sync Report"),
      ).toBeInTheDocument();
    });
  });

  it("provides an accessible name for the back button and navigates to /reports on click", async () => {
    reportApi.getTemplateById.mockResolvedValue({
      data: {
        _id: "test-tpl-123",
        name: "Weekly Sync Report",
        description: "",
        sections: [],
        defaultFilters: { dateRangeDays: 30 },
        isShared: false,
      },
    });

    render(
      <MemoryRouter>
        <ReportBuilder />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /back to reports/i }),
      ).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /back to reports/i });
    expect(backButton).toHaveAttribute("aria-label", "Back to Reports");

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/reports");
  });
});
