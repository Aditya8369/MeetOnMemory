import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SavedFilterBar from "../SavedFilterBar.jsx";

describe("SavedFilterBar Error & Empty States", () => {
  it("renders error alert with message and retry button when error prop is present", () => {
    const onRetry = vi.fn();
    render(
      <SavedFilterBar
        savedFilters={[]}
        error="Failed to load saved views"
        onRetry={onRetry}
      />,
    );

    const alertElement = screen.getByTestId("saved-filter-bar-error");
    expect(alertElement).toBeInTheDocument();
    expect(screen.getByText("Failed to load saved views")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders unpinned view indicator when saved filters exist but none are pinned", () => {
    const unpinnedFilters = [
      { _id: "f1", name: "Unpinned Filter", isPinned: false },
    ];
    render(
      <SavedFilterBar
        savedFilters={unpinnedFilters}
        onApplyFilter={vi.fn()}
        fetchFilters={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/1 saved view\(s\) available\. Pin a view/i),
    ).toBeInTheDocument();
  });
});
