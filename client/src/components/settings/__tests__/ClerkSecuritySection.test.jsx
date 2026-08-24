// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClerkSecuritySection from "../ClerkSecuritySection.jsx";
import { useUser, useClerk, useSession } from "@clerk/clerk-react";

vi.mock("@clerk/clerk-react", () => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
  useSession: vi.fn(),
}));

describe("ClerkSecuritySection Component (#2020)", () => {
  const mockOpenUserProfile = vi.fn();
  const mockRevoke = vi.fn().mockResolvedValue(true);
  const mockGetSessions = vi.fn().mockResolvedValue([
    {
      id: "sess-1",
      lastActiveAt: new Date().toISOString(),
      latestActivity: {
        browserName: "Chrome",
        deviceType: "Desktop",
        ipAddress: "127.0.0.1",
      },
      revoke: mockRevoke,
    },
    {
      id: "sess-2",
      lastActiveAt: new Date().toISOString(),
      latestActivity: {
        browserName: "Safari",
        deviceType: "iPhone",
        ipAddress: "192.168.1.1",
      },
      revoke: mockRevoke,
    },
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    useClerk.mockReturnValue({ openUserProfile: mockOpenUserProfile });
    useSession.mockReturnValue({ session: { id: "sess-1" } });
    useUser.mockReturnValue({
      user: {
        twoFactorEnabled: true,
        getSessions: mockGetSessions,
      },
    });
  });

  it("renders 2FA enabled badge and active sessions list", async () => {
    render(<ClerkSecuritySection />);

    expect(
      screen.getByText("Two-Factor Authentication (2FA)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions (2)")).toBeInTheDocument();
      expect(screen.getByText("This Device")).toBeInTheDocument();
      expect(screen.getByText("Revoke")).toBeInTheDocument();
    });
  });

  it("opens Clerk user profile when Manage 2FA is clicked", async () => {
    render(<ClerkSecuritySection />);

    const mfaBtn = screen.getByRole("button", { name: /manage 2fa/i });
    fireEvent.click(mfaBtn);

    expect(mockOpenUserProfile).toHaveBeenCalled();
  });

  it("revokes non-current session when Revoke button is clicked", async () => {
    render(<ClerkSecuritySection />);

    await waitFor(() => {
      expect(screen.getByText("Revoke")).toBeInTheDocument();
    });

    const revokeBtn = screen.getByRole("button", { name: /revoke/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalled();
    });
  });
});
