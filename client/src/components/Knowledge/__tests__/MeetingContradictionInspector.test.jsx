// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MeetingContradictionInspector from "../MeetingContradictionInspector.jsx";
import { knowledgeApi } from "../../../services/knowledgeApi";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("../../../services/knowledgeApi", () => ({
  knowledgeApi: {
    getMeetingConflicts: vi.fn(),
    scanMeetingConflicts: vi.fn(),
    resolveConflict: vi.fn(),
  },
}));

describe("MeetingContradictionInspector Component", () => {
  const mockMeetingId = "meeting123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders zero contradictions state when no conflicts exist", async () => {
    knowledgeApi.getMeetingConflicts.mockResolvedValue({
      data: { success: true, conflicts: [] },
    });

    render(<MeetingContradictionInspector meetingId={mockMeetingId} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("meeting-contradiction-inspector"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("contradiction-badge")).toHaveTextContent(
      "0 conflicts",
    );
    expect(
      screen.getByText(
        "No knowledge contradictions detected for this meeting.",
      ),
    ).toBeInTheDocument();
  });

  it("renders conflict card with side-by-side statements when conflicts exist", async () => {
    const mockConflict = {
      _id: "conflict1",
      modelType: "decision",
      confidence: 85,
      explanation: "Differing database choices detected between meetings.",
      memberSnapshots: [
        {
          memoryId: "mem1",
          text: "Database is PostgreSQL",
          sourceMeetingId: "otherMeeting",
        },
        {
          memoryId: "mem2",
          text: "Database migrated to MongoDB",
          sourceMeetingId: mockMeetingId,
        },
      ],
    };

    knowledgeApi.getMeetingConflicts.mockResolvedValue({
      data: { success: true, conflicts: [mockConflict] },
    });

    render(<MeetingContradictionInspector meetingId={mockMeetingId} />);

    await waitFor(() => {
      expect(screen.getByTestId("conflict-card-conflict1")).toBeInTheDocument();
    });

    expect(screen.getByText("AI Confidence: 85%")).toBeInTheDocument();
    expect(screen.getByText('"Database is PostgreSQL"')).toBeInTheDocument();
    expect(
      screen.getByText('"Database migrated to MongoDB"'),
    ).toBeInTheDocument();
  });

  it("runs contradiction scan when scan button is clicked", async () => {
    knowledgeApi.getMeetingConflicts.mockResolvedValue({
      data: { success: true, conflicts: [] },
    });
    knowledgeApi.scanMeetingConflicts.mockResolvedValue({
      data: { success: true, report: { totalConflictsFound: 1 } },
    });

    render(<MeetingContradictionInspector meetingId={mockMeetingId} />);

    await waitFor(() => {
      expect(screen.getByTestId("scan-meeting-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("scan-meeting-btn"));

    await waitFor(() => {
      expect(knowledgeApi.scanMeetingConflicts).toHaveBeenCalledWith(
        mockMeetingId,
        { dryRun: false },
      );
    });
  });

  it("resolves conflict by keeping selected member statement", async () => {
    const mockConflict = {
      _id: "conflict1",
      modelType: "decision",
      confidence: 90,
      explanation: "Owner mismatch detected.",
      memberSnapshots: [
        {
          memoryId: "mem1",
          text: "Frontend owner is Alice",
          sourceMeetingId: mockMeetingId,
        },
      ],
    };

    knowledgeApi.getMeetingConflicts.mockResolvedValue({
      data: { success: true, conflicts: [mockConflict] },
    });
    knowledgeApi.resolveConflict.mockResolvedValue({
      data: { success: true },
    });

    render(<MeetingContradictionInspector meetingId={mockMeetingId} />);

    await waitFor(() => {
      expect(screen.getByTestId("keep-member-btn-mem1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("keep-member-btn-mem1"));

    await waitFor(() => {
      expect(knowledgeApi.resolveConflict).toHaveBeenCalledWith("conflict1", {
        resolutionType: "kept_member",
        keptMemoryId: "mem1",
      });
    });
  });
});
