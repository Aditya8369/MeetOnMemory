import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RecapStoryViewer from "../RecapStoryViewer";
import apiClient from "../../../services/apiClient";

vi.mock("../../../services/apiClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("react-insta-stories", () => ({
  default: ({ stories, onAllStoriesEnd }) => (
    <div data-testid="react-insta-stories">
      <span>Stories count: {stories.length}</span>
      <button onClick={onAllStoriesEnd}>End Stories</button>
    </div>
  ),
}));

describe("RecapStoryViewer (#1800)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches story data via apiClient and renders the stories viewer", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        story: [
          { title: "Key Discussion", content: "Discussed Q3 goals", theme: "blue" },
          { title: "Action Items", content: "Alice to draft RFC", theme: "green" },
        ],
      },
    });

    const onClose = vi.fn();
    render(<RecapStoryViewer meetingId="mtg-123" onClose={onClose} />);

    expect(apiClient.get).toHaveBeenCalledWith("/api/meetings/mtg-123/story");

    await waitFor(() => {
      expect(screen.getByTestId("react-insta-stories")).toBeInTheDocument();
      expect(screen.getByText("Stories count: 2")).toBeInTheDocument();
    });
  });

  it("displays error dialog and allows retry when story fetch fails", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("Network Error"));

    const onClose = vi.fn();
    render(<RecapStoryViewer meetingId="mtg-123" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /recap story error/i })).toBeInTheDocument();
      expect(screen.getByText("Unable to Load Story")).toBeInTheDocument();
    });

    // Mock successful retry
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        recapStory: {
          title: "Meeting Summary",
          summary: "Summary content here",
        },
      },
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("react-insta-stories")).toBeInTheDocument();
    });
  });

  it("triggers onClose when close button is clicked", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        story: [{ title: "Intro", content: "Welcome" }],
      },
    });

    const onClose = vi.fn();
    render(<RecapStoryViewer meetingId="mtg-123" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId("react-insta-stories")).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: /close story viewer/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
