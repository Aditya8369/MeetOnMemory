import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import TeamMembers from "../TeamMembers";
import { useTeamManagement } from "../../hooks/useTeamManagement";

// Mock Navbar
vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

// Mock useTeamManagement hook
vi.mock("../../hooks/useTeamManagement", () => ({
  useTeamManagement: vi.fn(),
}));

describe("TeamMembers Page with Bulk Invitation Import", () => {
  const mockHandleSendInvite = vi.fn();
  const mockHandleBulkInvite = vi.fn();
  const mockFetchMembers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useTeamManagement.mockReturnValue({
      members: [
        {
          _id: "m1",
          name: "John Doe",
          email: "john@example.com",
          role: "member",
          createdAt: "2025-01-01",
        },
      ],
      invitations: [],
      loading: false,
      invitesLoading: false,
      error: null,
      isAdmin: true,
      fetchMembers: mockFetchMembers,
      handleSendInvite: mockHandleSendInvite,
      handleBulkInvite: mockHandleBulkInvite,
      handleResendInvite: vi.fn(),
      handleCancelInvite: vi.fn(),
      handleExpireInvite: vi.fn(),
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <TeamMembers />
      </BrowserRouter>,
    );

  it("renders Team Members header with Import CSV button for admins", () => {
    renderComponent();

    expect(screen.getByText("Team Members")).toBeInTheDocument();
    expect(screen.getByText("Import CSV")).toBeInTheDocument();
    expect(screen.getByText("Invite Member")).toBeInTheDocument();
  });

  it("opens BulkInviteModal when Import CSV button is clicked", async () => {
    renderComponent();

    const importCsvBtn = screen.getByText("Import CSV");
    fireEvent.click(importCsvBtn);

    await waitFor(() => {
      expect(screen.getByText("Bulk Import Invitations")).toBeInTheDocument();
      expect(screen.getByText("Download Sample CSV")).toBeInTheDocument();
    });
  });

  it("opens InviteMemberForm and switches to BulkInviteModal", async () => {
    renderComponent();

    const inviteMemberBtn = screen.getByText("Invite Member");
    fireEvent.click(inviteMemberBtn);

    await waitFor(() => {
      expect(screen.getByText("Invite Team Member")).toBeInTheDocument();
    });

    const switchToBulkBtn = screen.getByText(
      /need to invite multiple members\? import csv/i,
    );
    fireEvent.click(switchToBulkBtn);

    await waitFor(() => {
      expect(screen.getByText("Bulk Import Invitations")).toBeInTheDocument();
    });
  });
});
