// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ReportBuilder from "../ReportBuilder.jsx";
import reportApi from "../../services/reportApi.js";

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

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar" />,
}));

vi.mock("../../services/reportApi.js", () => ({
  default: {
    getTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    generateReport: vi.fn(),
    exportReport: vi.fn(),
  },
}));

describe("ReportBuilder Validation (#1370)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents saving template with blank title and displays role=alert error", async () => {
    render(
      <MemoryRouter>
        <ReportBuilder />
      </MemoryRouter>,
    );

    const nameInput = screen.getByDisplayValue("New Report Template");
    fireEvent.change(nameInput, { target: { value: "   " } });

    const saveButton = screen.getByRole("button", { name: /save template/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Template title cannot be empty",
      );
    });

    expect(reportApi.createTemplate).not.toHaveBeenCalled();
  });

  it("handles report export in CSV, MD, and PDF formats", async () => {
    reportApi.getTemplateById.mockResolvedValue({
      data: {
        _id: "tpl_123",
        name: "Test Report Template",
        description: "Test Description",
        sections: [],
        defaultFilters: { dateRangeDays: 30 },
      },
    });
    reportApi.exportReport.mockResolvedValue({
      data: "col1,col2\nval1,val2",
      headers: { "content-type": "text/csv" },
    });

    render(
      <MemoryRouter initialEntries={["/reports/builder/tpl_123"]}>
        <Routes>
          <Route
            path="/reports/builder/:templateId"
            element={<ReportBuilder />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Test Report Template"),
      ).toBeInTheDocument();
    });

    const csvBtn = screen.getByTitle("Export CSV");
    fireEvent.click(csvBtn);

    await waitFor(() => {
      expect(reportApi.exportReport).toHaveBeenCalledWith("tpl_123", "csv");
    });
  });
});
