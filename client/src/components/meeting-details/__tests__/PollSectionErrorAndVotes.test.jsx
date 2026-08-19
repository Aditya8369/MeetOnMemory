import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPollsByMeeting } from "../../../api/pollApi";
import AppContent from "../../../context/AppContent";
import PollSection from "../PollSection";

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("../../../services/apiClient.js", () => ({
  createClerkSocketOptions: vi.fn(async () => ({})),
}));

vi.mock("../../../api/pollApi", () => ({
  createPoll: vi.fn(),
  getPollsByMeeting: vi.fn(),
  castVote: vi.fn(),
  closePoll: vi.fn(),
  deletePoll: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PollSection error states and missing votes array safety (#1804)", () => {
  const mockUser = {
    _id: "user-123",
    name: "John Doe",
    role: "member",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays visual error banner when fetchPolls fails", async () => {
    getPollsByMeeting.mockRejectedValue(new Error("API Server Error"));

    render(
      <AppContent.Provider
        value={{ userData: mockUser, backendUrl: "http://localhost:5000" }}
      >
        <PollSection meetingId="meeting-123" />
      </AppContent.Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load polls. Please try again later."),
      ).toBeInTheDocument();
    });
  });

  it("safely handles polls with missing votes array (e.g. flat voteCount or anonymous polls)", async () => {
    const anonymousPoll = {
      _id: "poll-anon",
      question: "Is this safe?",
      createdBy: { _id: "user-creator", name: "Creator" },
      createdAt: "2026-08-01T10:00:00.000Z",
      isAnonymous: true,
      isClosed: false,
      options: [
        { _id: "opt-1", text: "Yes", voteCount: 5 },
        { _id: "opt-2", text: "No", voteCount: 2 },
      ],
    };

    getPollsByMeeting.mockResolvedValue([anonymousPoll]);

    render(
      <AppContent.Provider
        value={{ userData: mockUser, backendUrl: "http://localhost:5000" }}
      >
        <PollSection meetingId="meeting-123" />
      </AppContent.Provider>,
    );

    // Wait for the poll to render and assert it doesn't crash on missing opt.votes
    await waitFor(() => {
      expect(screen.getByText("Is this safe?")).toBeInTheDocument();
      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    // Check that vote percentages and counts are calculated correctly
    expect(screen.getByText("Total Votes: 7")).toBeInTheDocument();
  });
});
