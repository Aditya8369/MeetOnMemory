// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PersonalNotes from "../PersonalNotes";
import { personalNoteApi } from "../../../services";

vi.mock("../../../services", () => ({
  personalNoteApi: {
    getNoteByMeetingId: vi.fn(),
    upsertNote: vi.fn(),
    togglePin: vi.fn(),
    clearNoteContent: vi.fn(),
    addAnnotation: vi.fn(),
    removeAnnotation: vi.fn(),
  },
}));

describe("PersonalNotes Full Editor Wiring & Persistence (#1992)", () => {
  const baseMeeting = {
    _id: "meeting-992",
    title: "Project Sync",
    transcript: [
      { speaker: "Alice", text: "Welcome to the project sync meeting." },
      { speaker: "Bob", text: "Glad to be here." },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads existing personal note and annotations for current meeting on mount", async () => {
    personalNoteApi.getNoteByMeetingId.mockResolvedValueOnce({
      data: {
        success: true,
        note: {
          content: "# Meeting Key Takeaways\n- Follow up with team",
          isPinned: true,
          annotations: [
            {
              _id: "ann-1",
              annotationText: "project sync",
              sourceField: "transcript",
            },
          ],
        },
      },
    });

    render(<PersonalNotes meeting={baseMeeting} />);

    expect(personalNoteApi.getNoteByMeetingId).toHaveBeenCalledWith(
      "meeting-992",
    );

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(/# Meeting Key Takeaways/),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Active Highlights (1)")).toBeInTheDocument();
    expect(screen.getByText('"project sync"')).toBeInTheDocument();
  });

  it("persists empty content when notes are cleared (no stuck drafts)", async () => {
    personalNoteApi.getNoteByMeetingId.mockResolvedValueOnce({
      data: {
        success: true,
        note: {
          content: "Draft note content",
          isPinned: false,
          annotations: [],
        },
      },
    });
    personalNoteApi.clearNoteContent.mockResolvedValueOnce({
      data: { success: true, message: "Cleared" },
    });

    render(<PersonalNotes meeting={baseMeeting} />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Draft note content"),
      ).toBeInTheDocument();
    });

    const clearButton = screen.getByTitle("Clear personal notes");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(personalNoteApi.clearNoteContent).toHaveBeenCalledWith(
        "meeting-992",
      );
    });

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("toggles pin status optimistically and calls togglePin API", async () => {
    personalNoteApi.getNoteByMeetingId.mockResolvedValueOnce({
      data: {
        success: true,
        note: { content: "", isPinned: false, annotations: [] },
      },
    });
    personalNoteApi.togglePin.mockResolvedValueOnce({
      isPinned: true,
    });

    render(<PersonalNotes meeting={baseMeeting} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Pin note to dashboard"),
      ).toBeInTheDocument();
    });

    const pinButton = screen.getByLabelText("Pin note to dashboard");
    fireEvent.click(pinButton);

    await waitFor(() => {
      expect(personalNoteApi.togglePin).toHaveBeenCalledWith(
        "meeting-992",
        true,
      );
    });
  });

  it("removes active annotation when trash/close icon is clicked", async () => {
    personalNoteApi.getNoteByMeetingId.mockResolvedValueOnce({
      data: {
        success: true,
        note: {
          content: "Some notes",
          isPinned: false,
          annotations: [
            {
              _id: "ann-999",
              annotationText: "sync meeting",
              sourceField: "transcript",
            },
          ],
        },
      },
    });
    personalNoteApi.removeAnnotation.mockResolvedValueOnce({
      data: {
        success: true,
        note: { content: "Some notes", isPinned: false, annotations: [] },
      },
    });

    render(<PersonalNotes meeting={baseMeeting} />);

    await waitFor(() => {
      expect(screen.getByText('"sync meeting"')).toBeInTheDocument();
    });

    const removeBtn = screen.getByTitle("Remove highlight");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(personalNoteApi.removeAnnotation).toHaveBeenCalledWith(
        "meeting-992",
        "ann-999",
      );
    });
  });
});
