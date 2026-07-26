import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppContent from "../../context/AppContent";
import Dashboard from "../Dashboard";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("../../components/organization/TopContributorsWidget", () => ({
  default: () => <div data-testid="top-contributors">Top Contributors</div>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../../services/userApi", () => ({
  userApi: {
    getDashboardPreferences: vi.fn().mockResolvedValue({
      data: { success: true, dashboardPreferences: null },
    }),
    updateDashboardPreferences: vi.fn().mockResolvedValue({
      data: { success: true },
    }),
  },
}));

vi.mock("react-grid-layout/css/styles.css", () => ({}));
vi.mock("react-resizable/css/styles.css", () => ({}));

// Mirror react-grid-layout@2.x API: useContainerWidth returns an object, not a tuple.
vi.mock("react-grid-layout", () => ({
  Responsive: ({ children }) => (
    <div data-testid="responsive-grid">{children}</div>
  ),
  useContainerWidth: () => ({
    width: 1280,
    mounted: true,
    containerRef: { current: null },
    measureWidth: () => {},
  }),
}));

describe("Dashboard", () => {
  const mockUserData = {
    name: "Alice",
    role: "admin",
    organization: { name: "MeetOnMemory", _id: "org-1" },
  };

  it("renders without throwing when useContainerWidth returns an object", async () => {
    render(
      <MemoryRouter>
        <AppContent.Provider value={{ userData: mockUserData }}>
          <Dashboard />
        </AppContent.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByLabelText("Dashboard hero")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("responsive-grid")).toBeInTheDocument();
      expect(screen.getByText("dashboard.uploadMeetings")).toBeInTheDocument();
    });
  });
});
