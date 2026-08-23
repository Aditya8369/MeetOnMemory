import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import BulkActionBar from "../BulkActionBar.jsx";

describe("BulkActionBar Component", () => {
  it("renders count and action buttons when selectedCount > 0", () => {
    render(
      <BulkActionBar
        selectedCount={3}
        isProcessing={false}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onExport={vi.fn()}
        onTag={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByTitle("Archive")).toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
    expect(screen.getByTitle("Export as ZIP")).toBeInTheDocument();
    expect(screen.getByTitle("Add Tags")).toBeInTheDocument();
  });

  it("does not render when selectedCount is 0", () => {
    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        isProcessing={false}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onExport={vi.fn()}
        onTag={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("surfaces API errors when errorMessage is provided", () => {
    const onClearError = vi.fn();
    render(
      <BulkActionBar
        selectedCount={2}
        isProcessing={false}
        errorMessage="Permission denied to delete meetings."
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onExport={vi.fn()}
        onTag={vi.fn()}
        onCancel={vi.fn()}
        onClearError={onClearError}
      />,
    );

    const errorElement = screen.getByTestId("bulk-action-bar-error");
    expect(errorElement).toBeInTheDocument();
    expect(
      screen.getByText("Permission denied to delete meetings."),
    ).toBeInTheDocument();

    const dismissButton = screen.getByTitle("Dismiss error");
    fireEvent.click(dismissButton);
    expect(onClearError).toHaveBeenCalledTimes(1);
  });
});
