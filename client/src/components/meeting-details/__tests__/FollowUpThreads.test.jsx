import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FollowUpThreads from "../FollowUpThreads.jsx";
import AppContent from "../../../context/AppContent.js";
import * as followUpThreadApi from "../../../services/followUpThreadApi.js";

vi.mock("../../../services/followUpThreadApi.js", () => ({
  getFollowUpThreads: vi.fn(),
  createFollowUpThread: vi.fn(),
  createThreadReply: vi.fn(),
  updateThreadReply: vi.fn(),
  deleteThreadReply: vi.fn(),
  resolveFollowUpThread: vi.fn(),
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUserData = {
  _id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
};

const mockThreads = [
  {
    _id: "thread-1",
    content: "Need clarification on deployment schedule",
    type: "decision",
    status: "open",
    createdAt: new Date().toISOString(),
    creator: { _id: "user-1", name: "Jane Doe" },
    replies: [
      {
        _id: "reply-1",
        content: "Deploying next Tuesday after review.",
        sender: { _id: "user-2", name: "John Smith" },
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

describe("FollowUpThreads Component (#1875)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    followUpThreadApi.getFollowUpThreads.mockResolvedValue({
      success: true,
      threads: mockThreads,
    });
  });

  it("fetches and renders follow-up threads for the meeting", async () => {
    render(
      <AppContent.Provider
        value={{ userData: mockUserData, backendUrl: "http://localhost:4000" }}
      >
        <FollowUpThreads meetingId="meet-999" />
      </AppContent.Provider>,
    );

    expect(followUpThreadApi.getFollowUpThreads).toHaveBeenCalledWith(
      "meet-999",
    );

    await waitFor(() => {
      expect(
        screen.getByText("Deploying next Tuesday after review."),
      ).toBeInTheDocument();
      expect(screen.getByText("John Smith")).toBeInTheDocument();
    });
  });

  it("allows submitting a new thread", async () => {
    followUpThreadApi.createFollowUpThread.mockResolvedValueOnce({
      success: true,
      thread: {
        _id: "thread-2",
        anchorType: "general",
        status: "open",
        creator: mockUserData,
      },
      reply: {
        _id: "reply-2",
        content: "Budget approval status?",
        author: mockUserData,
      },
    });

    render(
      <AppContent.Provider
        value={{ userData: mockUserData, backendUrl: "http://localhost:4000" }}
      >
        <FollowUpThreads meetingId="meet-999" />
      </AppContent.Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/start a new thread/i),
      ).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/start a new thread/i);
    fireEvent.change(textarea, {
      target: { value: "Budget approval status?" },
    });

    const postBtn = screen.getByRole("button", { name: /start thread/i });
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(followUpThreadApi.createFollowUpThread).toHaveBeenCalledWith(
        "meet-999",
        {
          content: "Budget approval status?",
          anchorType: "general",
          mentions: [],
        },
      );
    });
  });

  it("allows resolving an open thread", async () => {
    followUpThreadApi.resolveFollowUpThread.mockResolvedValueOnce({
      success: true,
      thread: {
        ...mockThreads[0],
        status: "resolved",
      },
    });

    render(
      <AppContent.Provider
        value={{ userData: mockUserData, backendUrl: "http://localhost:4000" }}
      >
        <FollowUpThreads meetingId="meet-999" />
      </AppContent.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Mark Resolved")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark Resolved"));

    await waitFor(() => {
      expect(followUpThreadApi.resolveFollowUpThread).toHaveBeenCalledWith(
        "thread-1",
      );
    });
  });
});
