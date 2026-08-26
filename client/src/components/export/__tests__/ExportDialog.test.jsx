// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExportDialog from "../ExportDialog.jsx";
import exportTemplateApi from "../../../services/exportTemplateApi";

vi.mock("../../../services/exportTemplateApi", () => ({
  default: {
    getTemplates: vi.fn(),
    exportMeeting: vi.fn(),
    previewTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
  },
}));

describe("ExportDialog & TemplateEditor (#2003)", () => {
  const mockTemplates = [
    {
      _id: "t-1",
      name: "Executive Summary",
      description: "Executive high-level format",
      type: "standard",
      sections: { showSummary: true, showAttendees: true },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL methods for download test
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("fetches and displays templates on mount", async () => {
    exportTemplateApi.getTemplates.mockResolvedValue({
      success: true,
      data: mockTemplates,
    });

    render(<ExportDialog meetingId="m-101" onClose={vi.fn()} />);

    expect(screen.getByText("Export Meeting Minutes")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    });
  });

  it("triggers export document download when Download button is clicked", async () => {
    exportTemplateApi.getTemplates.mockResolvedValue({
      success: true,
      data: mockTemplates,
    });
    exportTemplateApi.exportMeeting.mockResolvedValue({
      data: new Blob(["dummy pdf content"]),
    });

    const onClose = vi.fn();
    render(<ExportDialog meetingId="m-101" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText(/Download PDF/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(exportTemplateApi.exportMeeting).toHaveBeenCalledWith(
        "m-101",
        expect.objectContaining({
          templateId: "t-1",
          format: "pdf",
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("opens custom TemplateEditor when Create Custom Template button is clicked", async () => {
    exportTemplateApi.getTemplates.mockResolvedValue({
      success: true,
      data: mockTemplates,
    });

    render(<ExportDialog meetingId="m-101" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    });

    const createBtn = screen.getByText("+ Create Custom Template");
    fireEvent.click(createBtn);

    expect(screen.getByTestId("template-editor-modal")).toBeInTheDocument();
    expect(screen.getByText("Create New Export Template")).toBeInTheDocument();
  });
});
