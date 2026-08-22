import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SchedulerWizard from "../SchedulerWizard.jsx";
import { schedulerApi } from "../../../services/schedulerApi.js";
import { organizationApi } from "../../../services/organizationApi.js";

vi.mock("../../../services/schedulerApi.js", () => ({
  schedulerApi: {
    createProposal: vi.fn(),
    confirmProposal: vi.fn(),
  },
}));

vi.mock("../../../services/organizationApi.js", () => ({
  organizationApi: {
    getMembers: vi.fn(),
  },
}));

const mockMembers = [
  {
    _id: "user-1",
    name: "Alice Developer",
    email: "alice@example.com",
    role: "Admin",
  },
  {
    _id: "user-2",
    name: "Bob Designer",
    email: "bob@example.com",
    role: "Member",
  },
  {
    _id: "user-3",
    name: "Charlie Product",
    email: "charlie@example.com",
    role: "Member",
  },
];

const mockProposalResponse = {
  success: true,
  data: {
    _id: "proposal-999",
    proposedSlots: [
      {
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
        score: 95,
        attendeeCount: 2,
        conflicts: [],
      },
    ],
  },
};

describe("SchedulerWizard Component (#1897)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizationApi.getMembers.mockResolvedValue({
      data: { success: true, members: mockMembers },
    });
    schedulerApi.createProposal.mockResolvedValue({
      data: mockProposalResponse,
    });
    schedulerApi.confirmProposal.mockResolvedValue({
      data: { success: true },
    });
  });

  it("fetches and displays organization members in participant picker", async () => {
    render(<SchedulerWizard onClose={vi.fn()} onScheduled={vi.fn()} />);

    expect(screen.getByText("Smart Scheduler")).toBeInTheDocument();
    expect(organizationApi.getMembers).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText("Alice Developer")).toBeInTheDocument();
      expect(screen.getByText("Bob Designer")).toBeInTheDocument();
      expect(screen.getByText("Charlie Product")).toBeInTheDocument();
    });
  });

  it("allows searching and selecting multiple team members", async () => {
    render(<SchedulerWizard onClose={vi.fn()} onScheduled={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Developer")).toBeInTheDocument();
    });

    // Select Alice
    fireEvent.click(screen.getByText("Alice Developer"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    // Select Bob
    fireEvent.click(screen.getByText("Bob Designer"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Search filter
    const searchInput = screen.getByPlaceholderText(
      /search organization members/i,
    );
    fireEvent.change(searchInput, { target: { value: "Charlie" } });

    expect(screen.getByLabelText("Remove Alice Developer")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Bob Designer")).toBeInTheDocument();
    expect(screen.getByText("Charlie Product")).toBeInTheDocument();

    // Select Charlie
    fireEvent.click(screen.getByText("Charlie Product"));
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Charlie Product")).toBeInTheDocument();
  });

  it("passes selected participant IDs to schedulerApi.createProposal", async () => {
    render(<SchedulerWizard onClose={vi.fn()} onScheduled={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Developer")).toBeInTheDocument();
    });

    // Enter title
    const titleInput = screen.getByPlaceholderText(/q3 planning/i);
    fireEvent.change(titleInput, {
      target: { value: "Sprint Architecture Sync" },
    });

    // Select Alice and Bob
    fireEvent.click(screen.getByText("Alice Developer"));
    fireEvent.click(screen.getByText("Bob Designer"));

    // Next step
    fireEvent.click(screen.getByRole("button", { name: /next: preferences/i }));

    // Generate proposals
    const generateBtn = screen.getByRole("button", {
      name: /find optimal times/i,
    });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(schedulerApi.createProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sprint Architecture Sync",
          participantIds: ["user-1", "user-2"],
          duration: 30,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Top Recommended Times/i)).toBeInTheDocument();
    });
  });

  it("supports handoff of finalized slot and participants to CreateMeeting", async () => {
    const onHandoff = vi.fn();
    render(
      <SchedulerWizard
        onClose={vi.fn()}
        onScheduled={vi.fn()}
        onHandoff={onHandoff}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Developer")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/q3 planning/i);
    fireEvent.change(titleInput, { target: { value: "Design Review" } });
    fireEvent.click(screen.getByText("Alice Developer"));

    fireEvent.click(screen.getByRole("button", { name: /next: preferences/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /find optimal times/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Customize")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Customize"));

    expect(onHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Design Review",
        duration: 30,
        proposalId: "proposal-999",
        participants: [
          expect.objectContaining({
            name: "Alice Developer",
            email: "alice@example.com",
            id: "user-1",
          }),
        ],
      }),
    );
  });
});
