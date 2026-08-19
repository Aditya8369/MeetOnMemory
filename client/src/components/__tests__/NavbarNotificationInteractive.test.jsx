import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Navbar from "../Navbar.jsx";
import AppContent from "../../context/AppContent";
import { notificationApi } from "../../services";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/dashboard" }),
  };
});

vi.mock("../../hooks/useRBAC.js", () => ({
  useRBAC: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
    role: "member",
  }),
}));

vi.mock("../../context/useTheme.jsx", () => ({
  default: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("../../context/usePreferences.jsx", () => ({
  default: () => ({
    preferences: { dateFormat: "relative" },
    updatePreferences: vi.fn(),
  }),
}));

vi.mock("../../services", () => ({
  notificationApi: {
    getUnreadCount: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
  },
  authApi: {},
  organizationApi: {
    getUserOrganizations: vi.fn().mockResolvedValue({
      data: { success: true, organizations: [] },
    }),
  },
}));

vi.mock("socket.io-client", () => ({
  io: () => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "u_1", name: "Alice" } }),
}));

describe("Navbar Notification Row Interactivity (#1640)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders interactive notification buttons and navigates to validated actionUrl marking as read", async () => {
    notificationApi.getUnreadCount.mockResolvedValue({
      data: { success: true, unreadCount: 1 },
    });
    notificationApi.getNotifications.mockResolvedValue({
      data: {
        success: true,
        notifications: [
          {
            _id: "notif_1",
            title: "New MoM Ready",
            description: "Minutes for Sprint 45 compiled",
            actionUrl: "/meetings/m_123",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    notificationApi.markAsRead.mockResolvedValue({
      data: { success: true },
    });

    render(
      <AppContent.Provider
        value={{
          userData: { role: "member", name: "Alice" },
          backendUrl: "http://localhost:4000",
        }}
      >
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AppContent.Provider>,
    );

    // Open notifications popover
    const bellBtn = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText("New MoM Ready")).toBeInTheDocument();
    });

    // Click notification row
    const notifRow = screen.getByText("New MoM Ready").closest("button");
    expect(notifRow).toBeInTheDocument();
    fireEvent.click(notifRow);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith("notif_1");
      expect(mockNavigate).toHaveBeenCalledWith("/meetings/m_123");
    });
  });

  it("safely falls back to /notifications when actionUrl is unsafe or external", async () => {
    notificationApi.getUnreadCount.mockResolvedValue({
      data: { success: true, unreadCount: 1 },
    });
    notificationApi.getNotifications.mockResolvedValue({
      data: {
        success: true,
        notifications: [
          {
            _id: "notif_2",
            title: "Security Alert",
            description: "Check your settings",
            actionUrl: "https://evil.com/phishing",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    notificationApi.markAsRead.mockResolvedValue({
      data: { success: true },
    });

    render(
      <AppContent.Provider
        value={{
          userData: { role: "member", name: "Alice" },
          backendUrl: "http://localhost:4000",
        }}
      >
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AppContent.Provider>,
    );

    const bellBtn = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText("Security Alert")).toBeInTheDocument();
    });

    const notifRow = screen.getByText("Security Alert").closest("button");
    fireEvent.click(notifRow);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith("notif_2");
      expect(mockNavigate).toHaveBeenCalledWith("/notifications");
    });
  });
});
