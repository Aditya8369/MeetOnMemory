import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const containerRef = { current: null };

// Mirror react-grid-layout@2.x API: useContainerWidth returns an object, not a tuple.
vi.mock("react-grid-layout", () => ({
  Responsive: ({ children }) => (
    <div data-testid="responsive-grid">{children}</div>
  ),
  useContainerWidth: () => ({
    width: 1280,
    mounted: true,
    containerRef,
    measureWidth: () => {},
  }),
}));

describe("Dashboard", () => {
  const mockUserData = {
    name: "Alice",
    role: "admin",
    organization: { name: "MeetOnMemory", _id: "org-1" },
  };

  let observe;
  let unobserve;
  let disconnect;

  beforeEach(() => {
    containerRef.current = null;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();

    // Immediately report observed cards as intersecting so .visible is applied.
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((callback) => {
        observe.mockImplementation((el) => {
          callback([{ isIntersecting: true, target: el }], {
            unobserve,
            disconnect,
          });
        });
        return { observe, unobserve, disconnect };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("applies .visible to dash-card feature cards so entrance animations can run (#682)", async () => {
    const { container } = render(
      <MemoryRouter>
        <AppContent.Provider value={{ userData: mockUserData }}>
          <Dashboard />
        </AppContent.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("dashboard.uploadMeetings")).toBeInTheDocument();
    });

    await waitFor(() => {
      const cards = container.querySelectorAll(".dash-card.fade-in-up");
      expect(cards.length).toBeGreaterThan(0);
      cards.forEach((card) => {
        expect(card.classList.contains("visible")).toBe(true);
      });
    });

    expect(IntersectionObserver).toHaveBeenCalled();
    expect(observe).toHaveBeenCalled();
  });
});
