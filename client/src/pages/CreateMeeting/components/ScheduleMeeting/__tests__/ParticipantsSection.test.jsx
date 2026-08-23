import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ParticipantsSection from "../ParticipantsSection.jsx";

describe("ParticipantsSection CSV import (#2056)", () => {
  const baseProps = {
    participants: [],
    newParticipant: { name: "", email: "" },
    setNewParticipant: vi.fn(),
    addParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    importParticipants: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("previews valid and invalid CSV rows then merges on confirm", async () => {
    const importParticipants = vi.fn();
    render(
      <ParticipantsSection
        {...baseProps}
        importParticipants={importParticipants}
      />,
    );

    const file = new File(
      [
        `email,name,role
good@example.com,Good Person,attendee
bad-email,No Email,
`,
      ],
      "participants.csv",
      { type: "text/csv" },
    );

    const input = screen.getByLabelText(/import participants from csv/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/CSV preview/i)).toBeInTheDocument();
      expect(screen.getByText(/Good Person/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid rows/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add 1 to list/i }));
    expect(importParticipants).toHaveBeenCalledWith([
      {
        name: "Good Person",
        email: "good@example.com",
        role: "attendee",
      },
    ]);
  });

  it("shows parse errors for missing headers", async () => {
    render(<ParticipantsSection {...baseProps} />);

    const file = new File([`role,message\nhost,hi`], "bad.csv", {
      type: "text/csv",
    });
    fireEvent.change(screen.getByLabelText(/import participants from csv/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/email.*name/i);
    });
  });
});
