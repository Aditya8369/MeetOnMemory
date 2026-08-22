import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "react-toastify";
import { meetingFeedbackApi } from "../../../services";
import FeedbackForm from "../FeedbackForm.jsx";

vi.mock("../../../services", () => ({
  meetingFeedbackApi: {
    getUserFeedbackForMeeting: vi.fn(),
    submitFeedback: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const MEETING_ID = "meeting-123";
const ORG_ID = "org-42";

const fillRequiredRatings = () => {
  fireEvent.click(
    screen.getByRole("button", { name: /overall rating 4 of 5/i }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /summary accuracy 5 of 5/i }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /transcript quality 3 of 5/i }),
  );
};

describe("FeedbackForm (#1983)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    meetingFeedbackApi.getUserFeedbackForMeeting.mockResolvedValue({
      data: { success: true, feedback: null },
    });
  });

  it("mounts with meeting and organization context after the previous-feedback check", async () => {
    render(<FeedbackForm meetingId={MEETING_ID} organizationId={ORG_ID} />);

    const form = await screen.findByTestId("meeting-feedback-form");
    expect(form).toHaveAttribute("data-meeting-id", MEETING_ID);
    expect(form).toHaveAttribute("data-organization-id", ORG_ID);
    expect(meetingFeedbackApi.getUserFeedbackForMeeting).toHaveBeenCalledWith(
      MEETING_ID,
    );
    expect(
      screen.getByRole("heading", { name: /meeting feedback/i }),
    ).toBeInTheDocument();
  });

  it("lets an authorized participant submit ratings through the existing feedback API", async () => {
    meetingFeedbackApi.submitFeedback.mockResolvedValue({
      data: {
        success: true,
        feedback: {
          meetingId: MEETING_ID,
          overallRating: 4,
          summaryAccuracy: 5,
          transcriptQuality: 3,
        },
      },
    });

    render(<FeedbackForm meetingId={MEETING_ID} organizationId={ORG_ID} />);

    await screen.findByRole("button", { name: /submit feedback/i });
    fillRequiredRatings();
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => {
      expect(meetingFeedbackApi.submitFeedback).toHaveBeenCalledTimes(1);
    });

    expect(meetingFeedbackApi.submitFeedback).toHaveBeenCalledWith({
      meetingId: MEETING_ID,
      overallRating: 4,
      summaryAccuracy: 5,
      transcriptQuality: 3,
      comment: "",
      tags: [],
    });
    const payload = meetingFeedbackApi.submitFeedback.mock.calls[0][0];
    expect(payload).not.toHaveProperty("organization");
    expect(payload).not.toHaveProperty("organizationId");
    expect(toast.success).toHaveBeenCalledWith(
      "Feedback submitted successfully!",
    );
  });

  it("shows a forbidden empty state and hides the form for unauthorized users", async () => {
    meetingFeedbackApi.getUserFeedbackForMeeting.mockRejectedValue({
      response: {
        status: 403,
        data: {
          message: "Not authorized to access feedback for this meeting",
        },
      },
    });

    render(<FeedbackForm meetingId={MEETING_ID} organizationId={ORG_ID} />);

    const forbidden = await screen.findByTestId("meeting-feedback-forbidden");
    expect(forbidden).toHaveTextContent(
      "Not authorized to access feedback for this meeting",
    );
    expect(
      screen.queryByRole("button", { name: /submit feedback/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: /meeting feedback/i }),
    ).not.toBeInTheDocument();
    expect(meetingFeedbackApi.submitFeedback).not.toHaveBeenCalled();
  });

  it("blocks submit when required ratings are missing", async () => {
    render(<FeedbackForm meetingId={MEETING_ID} organizationId={ORG_ID} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /submit feedback/i }),
    );

    expect(toast.error).toHaveBeenCalledWith(
      "Please provide ratings for all dimensions",
    );
    expect(meetingFeedbackApi.submitFeedback).not.toHaveBeenCalled();
  });

  it("surfaces API failures with the existing toast error pattern", async () => {
    meetingFeedbackApi.submitFeedback.mockRejectedValue({
      response: {
        status: 500,
        data: { message: "Server Error" },
      },
    });

    render(<FeedbackForm meetingId={MEETING_ID} organizationId={ORG_ID} />);

    await screen.findByRole("button", { name: /submit feedback/i });
    fillRequiredRatings();
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server Error");
    });
    expect(
      screen.getByRole("button", { name: /submit feedback/i }),
    ).toBeInTheDocument();
  });

  it("prevents double submission while a request is in flight", async () => {
    let resolveSubmit;
    meetingFeedbackApi.submitFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(<FeedbackForm meetingId={MEETING_ID} organizationId={ORG_ID} />);

    await screen.findByRole("button", { name: /submit feedback/i });
    fillRequiredRatings();

    const submitButton = screen.getByRole("button", {
      name: /submit feedback/i,
    });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.submit(submitButton.closest("form"));

    await waitFor(() => {
      expect(meetingFeedbackApi.submitFeedback).toHaveBeenCalledTimes(1);
    });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Submitting...");

    resolveSubmit({
      data: {
        success: true,
        feedback: {
          meetingId: MEETING_ID,
          overallRating: 4,
          summaryAccuracy: 5,
          transcriptQuality: 3,
        },
      },
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Feedback submitted successfully!",
      );
    });
  });
});
