import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import { castVote, getPollsByMeeting } from "../../../api/pollApi";
import AppContent from "../../../context/AppContent";
import PollSection from "../PollSection";

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
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

const POLL = {
  _id: "poll-1",
  meeting: "meeting-123",
  question: "Ship on Friday?",
  createdBy: { _id: "user-creator", name: "Bo" },
  createdAt: "2026-08-01T10:00:00.000Z",
  isAnonymous: false,
  isClosed: false,
  pollType: "single",
  options: [
    { _id: "opt-1", text: "Yes", votes: [] },
    { _id: "opt-2", text: "No", votes: [] },
  ],
};

const renderPolls = (userData, extraProps = {}) =>
  render(
    <AppContent.Provider
      value={{ userData, backendUrl: "http://localhost:5000" }}
    >
      <PollSection meetingId="meeting-123" {...extraProps} />
    </AppContent.Provider>,
  );

describe("PollSection wiring (#1982)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPollsByMeeting.mockResolvedValue([]);
  });

  it("shows a loading state before polls resolve", async () => {
    let resolvePolls;
    getPollsByMeeting.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePolls = resolve;
        }),
    );

    renderPolls({ _id: "user-1", name: "Ada", role: "member" });

    expect(screen.getByText(/loading polls/i)).toBeInTheDocument();

    resolvePolls([]);

    await waitFor(() => {
      expect(screen.getByText(/no polls created yet/i)).toBeInTheDocument();
    });
  });

  it("hides create controls from viewers", async () => {
    renderPolls({ _id: "user-1", name: "Ada", role: "viewer" });

    await waitFor(() => {
      expect(getPollsByMeeting).toHaveBeenCalledWith("meeting-123");
    });

    expect(
      screen.queryByRole("button", { name: /create poll/i }),
    ).not.toBeInTheDocument();
  });

  it("lets members create polls", async () => {
    renderPolls({ _id: "user-1", name: "Ada", role: "member" });

    expect(
      await screen.findByRole("button", { name: /create poll/i }),
    ).toBeInTheDocument();
  });

  it("reuses an existing meeting socket without opening a second connection", async () => {
    const socket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    const { unmount } = renderPolls(
      { _id: "user-1", name: "Ada", role: "member" },
      { socket, title: "Live Polls" },
    );

    await waitFor(() => {
      expect(socket.on).toHaveBeenCalledWith(
        "poll:created",
        expect.any(Function),
      );
    });

    expect(io).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: /live polls/i }),
    ).toBeInTheDocument();

    unmount();

    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.off).toHaveBeenCalledWith(
      "poll:created",
      expect.any(Function),
    );
  });

  it("submits a vote for an open poll", async () => {
    getPollsByMeeting.mockResolvedValue([POLL]);
    castVote.mockResolvedValue({});

    renderPolls({ _id: "user-1", name: "Ada", role: "member" });

    fireEvent.click(
      await screen.findByRole("button", { name: /vote for yes/i }),
    );

    await waitFor(() => {
      expect(castVote).toHaveBeenCalledWith("poll-1", ["opt-1"]);
    });
  });
});
