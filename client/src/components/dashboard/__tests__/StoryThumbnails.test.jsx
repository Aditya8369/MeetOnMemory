import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StoryThumbnails from "../StoryThumbnails";
import apiClient from "../../../services/apiClient";

vi.mock("../../../services/apiClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../../summaries/RecapStoryViewer", () => ({
  default: ({ meetingId, onClose }) => (
    <div data-testid="recap-story-viewer">
      Story Viewer for {meetingId}
      <button onClick={onClose}>Close Viewer</button>
    </div>
  ),
}));

describe("StoryThumbnails (#1800)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches recent meeting stories using apiClient and renders thumbnails", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        meetings: [
          { _id: "mtg-1", title: "Design Review" },
          { _id: "mtg-2", title: "Sprint Retro" },
        ],
      },
    });

    render(<StoryThumbnails />);

    expect(apiClient.get).toHaveBeenCalledWith("/api/meetings/stories/recent");

    await waitFor(() => {
      expect(screen.getByText("Design Review")).toBeInTheDocument();
      expect(screen.getByText("Sprint Retro")).toBeInTheDocument();
    });
  });

  it("displays error UI and allows retry when apiClient call fails", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("Network Error"));

    render(<StoryThumbnails />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to load recent meeting stories/i),
      ).toBeInTheDocument();
    });

    // Mock successful retry
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        meetings: [{ _id: "mtg-1", title: "Design Review" }],
      },
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Design Review")).toBeInTheDocument();
    });
  });

  it("opens RecapStoryViewer when a story thumbnail is clicked", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        meetings: [{ _id: "mtg-1", title: "Design Review" }],
      },
    });

    render(<StoryThumbnails />);

    await waitFor(() => {
      expect(screen.getByText("Design Review")).toBeInTheDocument();
    });

    const thumbnail = screen.getByRole("button", {
      name: /open story for design review/i,
    });
    fireEvent.click(thumbnail);

    expect(screen.getByTestId("recap-story-viewer")).toBeInTheDocument();
    expect(screen.getByText("Story Viewer for mtg-1")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close viewer/i });
    fireEvent.click(closeBtn);

    expect(
      screen.queryByTestId("recap-story-viewer"),
    ).not.toBeInTheDocument();
  });
});
