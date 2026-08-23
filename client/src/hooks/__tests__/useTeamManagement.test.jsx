import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import useTeamManagement from "../useTeamManagement";
import { organizationApi, invitationApi } from "../../services";
import AppContent from "../../context/AppContent";

// Mock API services
vi.mock("../../services", () => ({
  organizationApi: {
    getMembers: vi.fn(),
  },
  invitationApi: {
    getOrganizationInvitations: vi.fn(),
    createInvitation: vi.fn(),
    bulkImportInvitations: vi.fn(),
    resendInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
    expireInvitation: vi.fn(),
  },

  savedFilterApi: {
    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  },
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useTeamManagement", () => {
  const mockUserData = {
    role: "admin",
    organization: { _id: "org1" },
  };

  const wrapper = ({ children }) => (
    <AppContent.Provider value={{ userData: mockUserData }}>
      {children}
    </AppContent.Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    organizationApi.getMembers.mockResolvedValue({
      data: { success: true, members: [] },
    });
    invitationApi.getOrganizationInvitations.mockResolvedValue({
      data: { success: true, invitations: [] },
    });
  });

  it("initializes and fetches members automatically", async () => {
    const mockMembers = [{ _id: "1", name: "Test User" }];
    organizationApi.getMembers.mockResolvedValueOnce({
      data: { success: true, members: mockMembers },
    });

    const { result } = renderHook(() => useTeamManagement("members"), {
      wrapper,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members).toEqual(mockMembers);
    expect(organizationApi.getMembers).toHaveBeenCalledTimes(1);
  });

  it("fetches invitations when active tab is invitations and user is admin", async () => {
    const mockInvitations = [{ _id: "inv1", email: "test@invite.com" }];
    invitationApi.getOrganizationInvitations.mockResolvedValueOnce({
      data: { success: true, invitations: mockInvitations },
    });

    const { result } = renderHook(() => useTeamManagement("invitations"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.invitesLoading).toBe(false);
    });

    expect(result.current.invitations).toEqual(mockInvitations);
    expect(invitationApi.getOrganizationInvitations).toHaveBeenCalledWith(
      "org1",
    );
  });

  it("handles send invite", async () => {
    invitationApi.createInvitation.mockResolvedValueOnce({
      data: { success: true },
    });
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useTeamManagement("invitations"), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleSendInvite(
        { email: "test@example.com" },
        onSuccess,
      );
    });

    expect(invitationApi.createInvitation).toHaveBeenCalledWith({
      organizationId: "org1",
      email: "test@example.com",
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("handles bulk invite", async () => {
    const mockBulkResponse = {
      success: true,
      totalRows: 2,
      successful: 2,
      failed: 0,
      results: [],
    };
    invitationApi.bulkImportInvitations.mockResolvedValueOnce({
      data: mockBulkResponse,
    });
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useTeamManagement("invitations"), {
      wrapper,
    });

    const formData = new FormData();
    formData.append("file", new Blob(["email,role\na@b.com,member"]));

    let response;
    await act(async () => {
      response = await result.current.handleBulkInvite(formData, onSuccess);
    });

    expect(invitationApi.bulkImportInvitations).toHaveBeenCalledWith(formData);
    expect(formData.get("organizationId")).toBe("org1");
    expect(onSuccess).toHaveBeenCalledWith(mockBulkResponse);
    expect(response).toEqual(mockBulkResponse);
  });
});

