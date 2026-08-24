import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttachmentPanel from "../AttachmentPanel";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../services", () => ({
  attachmentApi: {
    getAttachments: vi.fn(),
    uploadAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
    previewAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
  },

  savedFilterApi: {
    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  },
}));

import { attachmentApi } from "../../../services";

describe("AttachmentPanel accessibility & Inline Preview (#2253)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes accessible names for icon-only attachment actions including preview", async () => {
    attachmentApi.getAttachments.mockResolvedValue({
      data: {
        success: true,
        attachments: [
          {
            _id: "att-1",
            fileName: "agenda.pdf",
            mimeType: "application/pdf",
            fileSize: 1024,
            uploadedBy: { name: "Alice" },
            createdAt: "2024-01-15T00:00:00.000Z",
          },
        ],
      },
    });

    render(<AttachmentPanel meetingId="meeting-1" />);

    await waitFor(() => {
      expect(screen.getByText("agenda.pdf")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Preview attachment agenda.pdf" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download attachment agenda.pdf" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete attachment agenda.pdf" }),
    ).toBeInTheDocument();
  });

  it("opens inline preview modal when preview is clicked and closes on close button", async () => {
    attachmentApi.getAttachments.mockResolvedValue({
      data: {
        success: true,
        attachments: [
          {
            _id: "att-img",
            fileName: "architecture.png",
            mimeType: "image/png",
            fileSize: 2048,
            uploadedBy: { name: "Bob" },
            createdAt: "2024-01-16T00:00:00.000Z",
          },
        ],
      },
    });
    attachmentApi.previewAttachment.mockResolvedValue({
      data: new ArrayBuffer(8),
    });

    render(<AttachmentPanel meetingId="meeting-1" />);

    await waitFor(() => {
      expect(screen.getByText("architecture.png")).toBeInTheDocument();
    });

    // Click preview
    fireEvent.click(
      screen.getByRole("button", {
        name: "Preview attachment architecture.png",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Attachment Preview Dialog" }),
      ).toBeInTheDocument();
    });

    // Close preview
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));

    expect(
      screen.queryByRole("dialog", { name: "Attachment Preview Dialog" }),
    ).not.toBeInTheDocument();
  });

  it("applies dark mode CSS classes for complete theme support", async () => {
    attachmentApi.getAttachments.mockResolvedValue({
      data: { success: true, attachments: [] },
    });

    const { container } = render(<AttachmentPanel meetingId="meeting-1" />);

    await waitFor(() => {
      expect(screen.getByText("No attachments yet")).toBeInTheDocument();
    });

    const rootElement = container.firstChild;
    expect(rootElement).toHaveClass("dark:bg-slate-900");
    expect(rootElement).toHaveClass("dark:border-slate-800");
  });
});
