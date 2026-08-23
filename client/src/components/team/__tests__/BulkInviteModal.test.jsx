import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BulkInviteModal from "../BulkInviteModal";

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("BulkInviteModal", () => {
  const mockOnClose = vi.fn();
  const mockOnBulkInvite = vi.fn();
  const mockOnSwitchToSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload step initially", () => {
    render(
      <BulkInviteModal
        onClose={mockOnClose}
        onBulkInvite={mockOnBulkInvite}
        onSwitchToSingle={mockOnSwitchToSingle}
      />,
    );

    expect(screen.getByText("Bulk Import Invitations")).toBeInTheDocument();
    expect(
      screen.getByText(/click to upload or drag & drop csv/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Download Sample CSV")).toBeInTheDocument();
    expect(
      screen.getByText("Want to invite a single user instead?"),
    ).toBeInTheDocument();
  });

  it("calls onClose when cancel or close button is clicked", () => {
    render(
      <BulkInviteModal
        onClose={mockOnClose}
        onBulkInvite={mockOnBulkInvite}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const closeIcon = screen.getByRole("button", { name: "Close modal" });
    fireEvent.click(closeIcon);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it("switches to single invite modal when requested", () => {
    render(
      <BulkInviteModal
        onClose={mockOnClose}
        onBulkInvite={mockOnBulkInvite}
        onSwitchToSingle={mockOnSwitchToSingle}
      />,
    );

    const switchBtn = screen.getByText("Want to invite a single user instead?");
    fireEvent.click(switchBtn);
    expect(mockOnSwitchToSingle).toHaveBeenCalledTimes(1);
  });

  it("progresses through file upload, mapping, preview, and submission", async () => {
    mockOnBulkInvite.mockResolvedValue({
      success: true,
      jobId: "job-123",
      totalRows: 2,
      successful: 2,
      failed: 0,
      results: [
        { email: "alice@example.com", success: true, invitationId: "inv-1" },
        { email: "bob@example.com", success: true, invitationId: "inv-2" },
      ],
    });

    render(
      <BulkInviteModal
        onClose={mockOnClose}
        onBulkInvite={mockOnBulkInvite}
      />,
    );

    const csvContent = "email,role,message\nalice@example.com,member,Hi\nbob@example.com,admin,Hello";
    const file = new File([csvContent], "invites.csv", { type: "text/csv" });

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Step 2: Mapping
    await waitFor(() => {
      expect(screen.getByText("Map CSV Columns")).toBeInTheDocument();
    });

    const previewButton = screen.getByRole("button", {
      name: /preview & validate/i,
    });
    fireEvent.click(previewButton);

    // Step 3: Preview
    await waitFor(() => {
      expect(screen.getByText("Total Rows")).toBeInTheDocument();
      expect(screen.getByText("Valid Rows")).toBeInTheDocument();
    });

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();

    const sendButton = screen.getByRole("button", {
      name: /send 2 invitations/i,
    });
    fireEvent.click(sendButton);

    // Step 4 & 5: Submission & Results
    await waitFor(() => {
      expect(mockOnBulkInvite).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText("All Invitations Sent Successfully"),
      ).toBeInTheDocument();
    });

    const doneButton = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("handles partial row failures correctly in results report", async () => {
    mockOnBulkInvite.mockResolvedValue({
      success: true,
      jobId: "job-456",
      totalRows: 2,
      successful: 1,
      failed: 1,
      results: [
        { email: "valid@example.com", success: true, invitationId: "inv-1" },
        {
          email: "already-member@example.com",
          success: false,
          error: "User is already a member of this organization.",
        },
      ],
    });

    render(
      <BulkInviteModal
        onClose={mockOnClose}
        onBulkInvite={mockOnBulkInvite}
      />,
    );

    const csvContent =
      "email,role\nvalid@example.com,member\nalready-member@example.com,member";
    const file = new File([csvContent], "invites.csv", { type: "text/csv" });

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Map CSV Columns")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /preview & validate/i }));

    await waitFor(() => {
      expect(screen.getByText("valid@example.com")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /send 2 invitations/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Import Completed with Some Failures"),
      ).toBeInTheDocument();
      expect(screen.getByText("User is already a member of this organization.")).toBeInTheDocument();
    });
  });
});
