import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MeetingRepository from "../MeetingRepository";
import { toast } from "react-toastify";
import { meetingApi } from "../../../services";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../services", () => ({
  meetingApi: {
    getAllMeetings: vi.fn(),
    deleteMeeting: vi.fn(),
    updateMeeting: vi.fn(),
  },
  savedFilterApi: {
    getFilters: vi
      .fn()
      .mockResolvedValue({ data: { success: true, filters: [] } }),
    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  },
}));

vi.mock("../MeetingCard.jsx", () => ({
  default: ({ meeting, onDelete }) => (
    <div>
      <span>{meeting.title}</span>
      <button onClick={() => onDelete(meeting._id)}>Delete Meeting</button>
    </div>
  ),
}));

vi.mock("../MeetingSearch.jsx", () => ({
  default: () => <div data-testid="meeting-search" />,
}));

vi.mock("../MeetingFilters.jsx", () => ({
  default: () => <div data-testid="meeting-filters" />,
}));

vi.mock("../Pagination.jsx", () => ({
  default: () => null,
}));

vi.mock("../EmptyState.jsx", () => ({
  default: () => <div>Empty</div>,
}));

describe("Meeting Soft Delete Recycle Bin CTA (#1685)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows toast with 'View Recycle Bin' CTA when meeting is soft deleted and navigates on click", async () => {
    meetingApi.getAllMeetings.mockResolvedValue({
      data: {
        success: true,
        meetings: [
          {
            _id: "m-123",
            title: "Sprint Planning",
            createdAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      },
    });

    meetingApi.deleteMeeting.mockResolvedValue({
      data: {
        success: true,
        message: "Meeting deleted successfully",
      },
    });

    render(
      <MemoryRouter>
        <MeetingRepository />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete meeting/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(meetingApi.deleteMeeting).toHaveBeenCalledWith("m-123");
      expect(toast.success).toHaveBeenCalled();
    });

    // Extract JSX passed to toast.success and render it to test interaction
    const toastCallArg = toast.success.mock.calls[0][0];
    const { getByRole, getByText } = render(toastCallArg);

    expect(getByText(/meeting moved to recycle bin/i)).toBeInTheDocument();
    const ctaButton = getByRole("button", { name: /view recycle bin/i });
    expect(ctaButton).toBeInTheDocument();

    fireEvent.click(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith("/meetings/recycle-bin");
  });
});
