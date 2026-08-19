import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PersonalNotes from "../PersonalNotes";

// Mock personalNoteApi
vi.mock("../../../services", () => ({
  personalNoteApi: {
    getNoteByMeetingId: vi.fn().mockResolvedValue({
      data: {
        success: true,
        note: {
          content: "Initial notes content",
          isPinned: false,
          annotations: [],
        },
      },
    }),
    upsertNote: vi.fn().mockResolvedValue({ data: { success: true } }),
    togglePin: vi.fn().mockResolvedValue({ data: { success: true } }),
  },

  savedFilterApi: {
    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  },
}));

describe("PersonalNotes Transcript Normalization and Safe Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseMeeting = {
    _id: "meeting-123",
    title: "Test Meeting",
  };

  it("should render fallback state when transcript is null", () => {
    const meeting = { ...baseMeeting, transcript: null };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("No transcript available.")).toBeInTheDocument();
  });

  it("should render fallback state when transcript is empty array", () => {
    const meeting = { ...baseMeeting, transcript: [] };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("No transcript available.")).toBeInTheDocument();
  });

  it("should render plain string transcript successfully", () => {
    const meeting = {
      ...baseMeeting,
      transcript: "Hello from string transcript",
    };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("Transcript:")).toBeInTheDocument();
    expect(
      screen.getByText("Hello from string transcript"),
    ).toBeInTheDocument();
  });

  it("should parse and render JSON string transcript successfully", () => {
    const transcriptArray = [
      { speaker: "Alice", text: "Hello inside JSON" },
      { speakerName: "Bob", content: "Hi from JSON" },
    ];
    const meeting = {
      ...baseMeeting,
      transcript: JSON.stringify(transcriptArray),
    };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("Alice:")).toBeInTheDocument();
    expect(screen.getByText("Hello inside JSON")).toBeInTheDocument();
    expect(screen.getByText("Bob:")).toBeInTheDocument();
    expect(screen.getByText("Hi from JSON")).toBeInTheDocument();
  });

  it("should render structured segments array successfully", () => {
    const meeting = {
      ...baseMeeting,
      transcript: [
        { speaker: "Dave", text: "Dave message" },
        { name: "Eve", body: "Eve body" },
      ],
    };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("Dave:")).toBeInTheDocument();
    expect(screen.getByText("Dave message")).toBeInTheDocument();
    expect(screen.getByText("Eve:")).toBeInTheDocument();
    expect(screen.getByText("Eve body")).toBeInTheDocument();
  });

  it("should render structured nested segments object successfully", () => {
    const meeting = {
      ...baseMeeting,
      transcript: {
        segments: [{ speaker: "Grace", text: "Grace nested" }],
      },
    };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("Grace:")).toBeInTheDocument();
    expect(screen.getByText("Grace nested")).toBeInTheDocument();
  });

  it("should handle array of plain strings safely", () => {
    const meeting = {
      ...baseMeeting,
      transcript: ["Hello string array", "Second string array"],
    };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getAllByText("Speaker:")).toHaveLength(2);
    expect(screen.getByText("Hello string array")).toBeInTheDocument();
    expect(screen.getByText("Second string array")).toBeInTheDocument();
  });

  it("should fail gracefully with fallback on malformed data shapes", () => {
    const meeting = {
      ...baseMeeting,
      transcript: [null, 123, { unknownField: "ignored" }],
    };
    render(<PersonalNotes meeting={meeting} />);

    expect(screen.getByText("No transcript available.")).toBeInTheDocument();
  });
});
