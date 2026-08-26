import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "react-toastify";
import { RBACProvider } from "../../../context/RBACContext.jsx";
import { meetingHealthApi } from "../../../services/meetingHealthApi";
import HealthScoreCard from "../HealthScoreCard.jsx";

vi.mock("../../../services/meetingHealthApi", () => ({
  meetingHealthApi: {
    getMeetingHealth: vi.fn(),
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

const HEALTH_RECORD = {
  meetingId: MEETING_ID,
  organization: ORG_ID,
  compositeScore: 84,
  factors: {
    agendaCoverage: 90,
    timeAdherence: 80,
    engagement: 75,
    actionItemClarity: 85,
    sentiment: 90,
  },
  recommendations: [
    "Great job! This meeting scored highly across all health metrics.",
  ],
};

const renderCard = (role = "member", props = {}) =>
  render(
    <MemoryRouter>
      <RBACProvider userRole={role}>
        <HealthScoreCard
          meetingId={MEETING_ID}
          organizationId={ORG_ID}
          {...props}
        />
      </RBACProvider>
    </MemoryRouter>,
  );

describe("HealthScoreCard (#1984)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    meetingHealthApi.getMeetingHealth.mockResolvedValue({
      success: true,
      data: HEALTH_RECORD,
    });
  });

  it("mounts with meeting and organization context and loads the existing health API", async () => {
    renderCard();

    expect(
      screen.getByLabelText(/loading meeting health score/i),
    ).toBeInTheDocument();

    const card = await screen.findByTestId("meeting-health-score-card");
    expect(card).toHaveAttribute("data-meeting-id", MEETING_ID);
    expect(card).toHaveAttribute("data-organization-id", ORG_ID);
    expect(meetingHealthApi.getMeetingHealth).toHaveBeenCalledWith(MEETING_ID);
    expect(
      screen.getByRole("heading", { name: /meeting health score/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
  });

  it("shows a forbidden empty state and hides calculate when the API rejects access", async () => {
    meetingHealthApi.getMeetingHealth.mockRejectedValue({
      response: {
        status: 403,
        data: {
          message: "Forbidden: Organization membership required",
        },
      },
    });

    renderCard();

    const forbidden = await screen.findByTestId(
      "meeting-health-score-forbidden",
    );
    expect(forbidden).toHaveTextContent(
      "Forbidden: Organization membership required",
    );
    expect(
      screen.queryByRole("button", { name: /calculate score|refresh score/i }),
    ).not.toBeInTheDocument();
    expect(meetingHealthApi.getMeetingHealth).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when health has not been calculated yet", async () => {
    meetingHealthApi.getMeetingHealth.mockResolvedValue({
      success: true,
      data: null,
    });

    renderCard();

    const empty = await screen.findByTestId("meeting-health-score-empty");
    expect(empty).toHaveTextContent(
      "Meeting health has not been calculated yet.",
    );
    expect(
      screen.getByRole("button", { name: /calculate score/i }),
    ).toBeInTheDocument();
  });

  it("surfaces fetch errors with toast and an empty retry state", async () => {
    meetingHealthApi.getMeetingHealth.mockRejectedValue({
      response: {
        status: 500,
        data: { message: "Server Error" },
      },
    });

    renderCard();

    expect(
      await screen.findByTestId("meeting-health-score-empty"),
    ).toHaveTextContent("Server Error");
    expect(toast.error).toHaveBeenCalledWith("Server Error");
    expect(
      screen.getByRole("button", { name: /calculate score/i }),
    ).toBeInTheDocument();
  });

  it("lets a permitted member calculate from the empty state via the existing GET API", async () => {
    meetingHealthApi.getMeetingHealth
      .mockResolvedValueOnce({ success: true, data: null })
      .mockResolvedValueOnce({ success: true, data: HEALTH_RECORD });

    renderCard("member");

    fireEvent.click(
      await screen.findByRole("button", { name: /calculate score/i }),
    );

    await waitFor(() => {
      expect(meetingHealthApi.getMeetingHealth).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("84")).toBeInTheDocument();
  });

  it("lets a permitted member refresh a loaded score", async () => {
    renderCard("member");

    fireEvent.click(
      await screen.findByRole("button", { name: /refresh score/i }),
    );

    await waitFor(() => {
      expect(meetingHealthApi.getMeetingHealth).toHaveBeenCalledTimes(2);
    });
  });

  it("hides calculate and refresh when the caller cannot view meetings", async () => {
    meetingHealthApi.getMeetingHealth.mockResolvedValue({
      success: true,
      data: null,
    });

    renderCard(null);

    await screen.findByTestId("meeting-health-score-empty");
    expect(
      screen.queryByRole("button", { name: /calculate score|refresh score/i }),
    ).not.toBeInTheDocument();
  });

  it("links to the organization Meeting Health dashboard when reports.view is allowed", async () => {
    renderCard("member");

    const link = await screen.findByRole("link", {
      name: /view organization health/i,
    });
    expect(link).toHaveAttribute("href", "/meeting-health");
  });

  it("hides the organization dashboard link for roles without reports.view", async () => {
    renderCard("guest");

    await screen.findByTestId("meeting-health-score-card");
    expect(
      screen.queryByRole("link", { name: /view organization health/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh score/i }),
    ).toBeInTheDocument();
  });
});
