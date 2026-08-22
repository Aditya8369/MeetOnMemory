// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MeetingCollaborativeNotes from "../MeetingCollaborativeNotes.jsx";
import AppContent from "../../../context/AppContent.js";

vi.mock("../../meetings/CollaborativeEditor", () => ({
  default: ({ meetingId, isReadOnly }) => (
    <div data-testid="mock-collaborative-editor">
      <span data-testid="editor-meeting-id">{meetingId}</span>
      <span data-testid="editor-readonly">{isReadOnly ? "true" : "false"}</span>
    </div>
  ),
}));

describe("MeetingCollaborativeNotes on Meeting Details (#2009)", () => {
  const meeting = {
    _id: "meet-789",
    title: "Product Sync",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CollaborativeEditor with isReadOnly=false for authorized members", () => {
    render(
      <AppContent.Provider value={{ userData: { role: "member" } }}>
        <MeetingCollaborativeNotes meeting={meeting} />
      </AppContent.Provider>,
    );

    expect(screen.getByTestId("mock-collaborative-editor")).toBeInTheDocument();
    expect(screen.getByTestId("editor-meeting-id")).toHaveTextContent(
      "meet-789",
    );
    expect(screen.getByTestId("editor-readonly")).toHaveTextContent("false");
    expect(screen.getByText("Collaborative")).toBeInTheDocument();
  });

  it("renders CollaborativeEditor with isReadOnly=true for viewers", () => {
    render(
      <AppContent.Provider value={{ userData: { role: "viewer" } }}>
        <MeetingCollaborativeNotes meeting={meeting} />
      </AppContent.Provider>,
    );

    expect(screen.getByTestId("mock-collaborative-editor")).toBeInTheDocument();
    expect(screen.getByTestId("editor-readonly")).toHaveTextContent("true");
    expect(screen.getByText("Read-Only")).toBeInTheDocument();
  });

  it("collapses and expands the editor when header is clicked", () => {
    render(
      <AppContent.Provider value={{ userData: { role: "admin" } }}>
        <MeetingCollaborativeNotes meeting={meeting} />
      </AppContent.Provider>,
    );

    expect(screen.getByTestId("mock-collaborative-editor")).toBeInTheDocument();

    // Toggle collapse
    fireEvent.click(screen.getByTestId("toggle-collab-notes-btn"));
    expect(
      screen.queryByTestId("mock-collaborative-editor"),
    ).not.toBeInTheDocument();

    // Toggle expand
    fireEvent.click(screen.getByTestId("toggle-collab-notes-btn"));
    expect(screen.getByTestId("mock-collaborative-editor")).toBeInTheDocument();
  });
});
