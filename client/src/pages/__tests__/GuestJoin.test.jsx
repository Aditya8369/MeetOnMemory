import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import GuestJoin from "../GuestJoin.jsx";
import { getGuestMeetingData } from "../../services/guestAccessApi.js";

// Mock the API service
vi.mock("../../services/guestAccessApi.js", () => ({
  getGuestMeetingData: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: () => ({ token: "mock-guest-token-123" }),
    useNavigate: () => mockNavigate,
  };
});

describe("GuestJoin Landing Page (#1900)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully fetches meeting details and navigates to the meeting view on form submit", async () => {
    getGuestMeetingData.mockResolvedValue({
      meeting: {
        title: "Board Alignment Meeting",
        date: "2026-08-15T14:00:00.000Z",
      },
    });

    render(
      <BrowserRouter>
        <GuestJoin />
      </BrowserRouter>,
    );

    // Wait for the meeting info to load
    await waitFor(() => {
      expect(screen.getByText("Board Alignment Meeting")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("your.email@example.com"),
      ).toBeInTheDocument();
    });

    // Enter email address and submit
    fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
      target: { value: "external.guest@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Enter Meeting Room" }),
    );

    // Assert redirection to GuestMeetingView
    expect(mockNavigate).toHaveBeenCalledWith("/guest/mock-guest-token-123");
  });

  it("renders access denied view on invalid or expired token", async () => {
    getGuestMeetingData.mockRejectedValue({
      response: { data: { error: "This token has expired or is invalid." } },
    });

    render(
      <BrowserRouter>
        <GuestJoin />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText("This token has expired or is invalid."),
      ).toBeInTheDocument();
    });
  });
});
