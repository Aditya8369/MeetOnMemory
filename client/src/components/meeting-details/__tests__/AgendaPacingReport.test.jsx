import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { meetingApi } from "../../../services";
import AgendaPacingReport from "../AgendaPacingReport.jsx";

vi.mock("../../../services", () => ({
  meetingApi: {
    getAgendaPacingReport: vi.fn(),
  },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div data-testid="pacing-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const MEETING_ID = "meeting-123";

const PACING_RESPONSE = {
  data: {
    success: true,
    reportData: [
      {
        id: "item-1",
        text: "Review design",
        plannedDuration: 10,
        actualDuration: 12,
        actualDurationMs: 12 * 60000,
        status: "completed",
      },
    ],
    summaryStats: {
      totalPlanned: 10,
      totalActual: 12,
      itemsOverTime: 1,
      itemsSkipped: 0,
    },
    agendaProgress: "completed",
  },
};

describe("AgendaPacingReport (#1986)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    meetingApi.getAgendaPacingReport.mockResolvedValue(PACING_RESPONSE);
  });

  it("shows a loading state while the existing pacing API is in flight", () => {
    meetingApi.getAgendaPacingReport.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<AgendaPacingReport meetingId={MEETING_ID} />);

    expect(
      screen.getByLabelText(/loading agenda pacing report/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("agenda-pacing-report")).toHaveAttribute(
      "data-meeting-id",
      MEETING_ID,
    );
    expect(meetingApi.getAgendaPacingReport).toHaveBeenCalledWith(MEETING_ID);
  });

  it("renders planned-vs-actual stats from meetingApi.getAgendaPacingReport", async () => {
    render(<AgendaPacingReport meetingId={MEETING_ID} />);

    expect(
      await screen.findByRole("heading", { name: /agenda pacing report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("10 min")).toBeInTheDocument();
    expect(screen.getByText("12 min")).toBeInTheDocument();
    expect(screen.getByTestId("pacing-chart")).toBeInTheDocument();
  });

  it("shows an empty state when the timer was never used", async () => {
    meetingApi.getAgendaPacingReport.mockResolvedValue({
      data: {
        success: true,
        reportData: [
          {
            id: "item-1",
            text: "Review design",
            plannedDuration: 10,
            actualDuration: 0,
            actualDurationMs: 0,
            status: "pending",
          },
        ],
        summaryStats: {
          totalPlanned: 10,
          totalActual: 0,
          itemsOverTime: 0,
          itemsSkipped: 0,
        },
        agendaProgress: "not_started",
      },
    });

    render(<AgendaPacingReport meetingId={MEETING_ID} />);

    expect(
      await screen.findByTestId("agenda-pacing-report-empty"),
    ).toHaveTextContent(/no agenda timer data was recorded/i);
    expect(screen.queryByTestId("pacing-chart")).not.toBeInTheDocument();
  });

  it("shows the same empty state when the API returns no report rows", async () => {
    meetingApi.getAgendaPacingReport.mockResolvedValue({
      data: {
        success: true,
        reportData: [],
        summaryStats: {
          totalPlanned: 0,
          totalActual: 0,
          itemsOverTime: 0,
          itemsSkipped: 0,
        },
        agendaProgress: "not_started",
      },
    });

    render(<AgendaPacingReport meetingId={MEETING_ID} />);

    expect(
      await screen.findByTestId("agenda-pacing-report-empty"),
    ).toHaveTextContent(/no agenda timer data was recorded/i);
  });

  it("shows an error state when the pacing API fails", async () => {
    meetingApi.getAgendaPacingReport.mockRejectedValue({
      response: { data: { message: "Server Error" } },
    });

    render(<AgendaPacingReport meetingId={MEETING_ID} />);

    expect(
      await screen.findByTestId("agenda-pacing-report-error"),
    ).toHaveTextContent("Server Error");
  });
});
