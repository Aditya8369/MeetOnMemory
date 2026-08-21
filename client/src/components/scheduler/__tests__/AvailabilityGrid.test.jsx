import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AvailabilityGrid from "../AvailabilityGrid.jsx";

const mockProposals = [
  {
    startTime: new Date("2026-09-01T10:00:00.000Z").toISOString(),
    endTime: new Date("2026-09-01T10:30:00.000Z").toISOString(),
    score: 95,
    attendeeCount: 3,
    conflicts: [],
  },
  {
    startTime: new Date("2026-09-01T14:00:00.000Z").toISOString(),
    endTime: new Date("2026-09-01T14:30:00.000Z").toISOString(),
    score: 60,
    attendeeCount: 2,
    conflicts: ["user-3"],
  },
];

describe("AvailabilityGrid Component (#1897)", () => {
  it("renders empty state when no proposals are provided", () => {
    render(
      <AvailabilityGrid proposals={[]} onConfirm={vi.fn()} isLoading={false} />,
    );
    expect(screen.getByText("No optimal slots found")).toBeInTheDocument();
  });

  it("renders recommended times and scores", () => {
    render(
      <AvailabilityGrid
        proposals={mockProposals}
        onConfirm={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/Top Recommended Times/i)).toBeInTheDocument();
    expect(screen.getByText("95% Match")).toBeInTheDocument();
    expect(screen.getByText("60% Match")).toBeInTheDocument();
    expect(screen.getByText("3 available")).toBeInTheDocument();
    expect(screen.getByText("1 conflict")).toBeInTheDocument();
  });

  it("triggers onConfirm when Confirm Meeting is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <AvailabilityGrid
        proposals={mockProposals}
        onConfirm={onConfirm}
        isLoading={false}
      />,
    );

    const confirmBtns = screen.getAllByRole("button", {
      name: /confirm meeting/i,
    });
    fireEvent.click(confirmBtns[0]);

    expect(onConfirm).toHaveBeenCalledWith(mockProposals[0]);
  });

  it("triggers onHandoff when Customize is clicked", () => {
    const onHandoff = vi.fn();
    render(
      <AvailabilityGrid
        proposals={mockProposals}
        onConfirm={vi.fn()}
        onHandoff={onHandoff}
        isLoading={false}
      />,
    );

    const customizeBtns = screen.getAllByRole("button", {
      name: /customize/i,
    });
    fireEvent.click(customizeBtns[0]);

    expect(onHandoff).toHaveBeenCalledWith(mockProposals[0]);
  });
});
