import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CalendarGrid from "../CalendarGrid.jsx";

describe("CalendarGrid Mobile Responsiveness (#1639)", () => {
  const dummyMeetings = [
    {
      _id: "m_1",
      title: "Sprint Planning",
      date: new Date().toISOString(),
      time: "10:00 AM",
      status: "completed",
    },
  ];

  it("renders with horizontal overflow container for month view", () => {
    render(
      <CalendarGrid
        view="month"
        currentDate={new Date()}
        filteredMeetings={dummyMeetings}
        setSelectedMeeting={vi.fn()}
      />,
    );

    const container = screen.getByTestId("calendar-grid-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("overflow-x-auto");
    expect(container).toHaveClass("max-w-full");
    expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
  });

  it("renders with horizontal overflow container for week view", () => {
    render(
      <CalendarGrid
        view="week"
        currentDate={new Date()}
        filteredMeetings={dummyMeetings}
        setSelectedMeeting={vi.fn()}
      />,
    );

    const container = screen.getByTestId("calendar-grid-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("overflow-x-auto");
    expect(container).toHaveClass("max-w-full");
  });

  it("renders day view appropriately", () => {
    render(
      <CalendarGrid
        view="day"
        currentDate={new Date()}
        filteredMeetings={dummyMeetings}
        setSelectedMeeting={vi.fn()}
      />,
    );

    const container = screen.getByTestId("calendar-grid-container");
    expect(container).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });
});
