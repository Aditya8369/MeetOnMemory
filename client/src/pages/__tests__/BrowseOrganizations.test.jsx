import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import BrowseOrganizations from "../BrowseOrganizations/BrowseOrganizations";
import { organizationApi, membershipRequestApi } from "../../services";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("../../services", () => ({
  organizationApi: {
    browsePublicOrganizations: vi.fn(),
    joinOrganization: vi.fn(),
  },
  membershipRequestApi: {
    createRequest: vi.fn(),
  },
}));

const mockOrganizations = [
  {
    _id: "org-1",
    name: "Open Community",
    slug: "open-community",
    description: "A public org with open join",
    visibility: "public",
    joinPolicy: "open",
    memberCount: 12,
    createdAt: "2025-01-01T00:00:00.000Z",
    membershipStatus: "none",
  },
  {
    _id: "org-2",
    name: "Approval Required Org",
    slug: "approval-org",
    description: "Requires admin approval",
    visibility: "public",
    joinPolicy: "approval_required",
    memberCount: 4,
    createdAt: "2025-02-01T00:00:00.000Z",
    membershipStatus: "none",
  },
];

describe("BrowseOrganizations (#293)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizationApi.browsePublicOrganizations.mockResolvedValue({
      data: {
        success: true,
        organizations: mockOrganizations,
        pagination: {
          page: 1,
          limit: 12,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });
  });

  it("loads and renders public organizations for discovery", async () => {
    render(
      <MemoryRouter>
        <BrowseOrganizations />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByText("Discover Organizations")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Open Community")).toBeInTheDocument();
    });

    expect(screen.getByText("Approval Required Org")).toBeInTheDocument();
    expect(organizationApi.browsePublicOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        search: "",
        sortBy: "createdAt",
        filter: "all",
      }),
    );
  });

  it("shows join vs request labels based on join policy", async () => {
    render(
      <MemoryRouter>
        <BrowseOrganizations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Open Community")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: /Join/i })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /^Request Join$/i }),
    ).toBeInTheDocument();
  });

  it("submits a membership request for approval-required organizations", async () => {
    membershipRequestApi.createRequest.mockResolvedValue({
      data: { success: true },
    });

    render(
      <MemoryRouter>
        <BrowseOrganizations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Approval Required Org")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Request Join/i }));

    await waitFor(() => {
      expect(membershipRequestApi.createRequest).toHaveBeenCalledWith({
        organizationId: "org-2",
        message: "Request to join via Browse Organizations",
      });
    });
  });

  it("links back to the organization hub", async () => {
    render(
      <MemoryRouter>
        <BrowseOrganizations />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Back to Organization Hub/i }),
    ).toHaveAttribute("href", "/organizations");
  });
});
