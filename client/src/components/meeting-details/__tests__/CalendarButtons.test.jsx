import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MeetingHeader from "../MeetingHeader.jsx";
import MeetingActions from "../MeetingActions.jsx";
import * as calendarExport from "../../../utils/calendarExport.js";

// Mock calendarExport utilities
vi.spyOn(calendarExport, "generateICS").mockImplementation(() => {});

// Mock askAssistantAbout utility
vi.mock("../../../utils/askAssistant.js", () => ({
  askAssistantAbout: vi.fn(),
}));

// Mock useExport hook
vi.mock("../../../hooks/useExport.js", () => ({
  default: () => ({ exportMeeting: vi.fn(), isExporting: false }),
}));

describe("Add to Calendar buttons on Meeting Details (#2057)", () => {
  const mockMeeting = {
    _id: "m123",
    title: "Quarterly Review Meeting",
    description: "Discussing quarterly highlights and objectives.",
    location: "Zoom",
    venue: "https://zoom.us/j/123456789",
    date: "2026-08-30T10:00:00.000Z",
    duration: 90,
    agendaItems: [
      { text: "Agenda item 1", description: "First part details" },
      { text: "Agenda item 2", description: "Second part details" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Add to Calendar button in MeetingHeader and displays options on click", () => {
    render(
      <MemoryRouter>
        <MeetingHeader
          meeting={mockMeeting}
          onShare={vi.fn()}
          onShareInvite={vi.fn()}
          onPresent={vi.fn()}
        />
      </MemoryRouter>,
    );

    const calendarBtn = screen.getByText("Add to Calendar");
    expect(calendarBtn).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(calendarBtn);

    // Verify calendar options are visible
    expect(screen.getByText("Download ICS")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Outlook Web")).toBeInTheDocument();

    // Click Download ICS option
    fireEvent.click(screen.getByText("Download ICS"));
    expect(calendarExport.generateICS).toHaveBeenCalledWith(mockMeeting);
  });

  it("renders Add to Calendar button in MeetingActions and displays options on click", () => {
    render(
      <MemoryRouter>
        <MeetingActions
          meeting={mockMeeting}
          onDelete={vi.fn()}
          onRename={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Get calendar button in actions grid
    const calendarBtn = screen.getByText("Add to Calendar");
    expect(calendarBtn).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(calendarBtn);

    // Verify calendar options
    expect(screen.getByText("Download ICS")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Outlook Web")).toBeInTheDocument();

    // Click Download ICS
    fireEvent.click(screen.getByText("Download ICS"));
    expect(calendarExport.generateICS).toHaveBeenCalledWith(mockMeeting);
  });
});
