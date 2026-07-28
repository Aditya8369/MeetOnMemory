import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppContent from "../../context/AppContent";
import Dashboard from "../Dashboard";
import { userApi } from "../../services/userApi";

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
    getDashboardPreferences: vi.fn(),
    updateDashboardPreferences: vi.fn(),
  },
}));

vi.mock("react-grid-layout/css/styles.css", () => ({}));
vi.mock("react-resizable/css/styles.css", () => ({}));

// Keep containerRef inside the mock factory — vi.mock is hoisted, so an outer
// const would be uninitialized and leave Dashboard with containerRef === undefined
// (crash → empty <body><div /></body>).
vi.mock("react-grid-layout", async () => {
  const React = await import("react");
  const containerRef = { current: null };

  return {
    Responsive: ({ children }) =>
      React.createElement(
        "div",
        { "data-testid": "responsive-grid" },
        children,
      ),
    useContainerWidth: () => ({
      width: 1280,
      mounted: true,
      containerRef,
      measureWidth: () => {},
    }),
  };
});

/**
 * Browser-like IntersectionObserver: constructable via `new`, supports
 * observe/unobserve/disconnect/takeRecords, and fires immediately with
 * isIntersecting: true so Dashboard can add `.visible`.
 */
class MockIntersectionObserver {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    this._observed = new Set();
  }

  observe(target) {
    if (!target) return;
    this._observed.add(target);
    this.callback(
      [
        {
          isIntersecting: true,
          target,
          intersectionRatio: 1,
          time: Date.now(),
          boundingClientRect: target.getBoundingClientRect?.() ?? {},
          intersectionRect: target.getBoundingClientRect?.() ?? {},
          rootBounds: null,
        },
      ],
      this,
    );
  }

  unobserve(target) {
    this._observed.delete(target);
  }

  disconnect() {
    this._observed.clear();
  }

  takeRecords() {
    return [];
  }
}

describe("Dashboard", () => {
  const mockUserData = {
    name: "Alice",
    role: "admin",
    organization: { name: "MeetOnMemory", _id: "org-1" },
  };

  beforeEach(() => {
    globalThis.IntersectionObserver = MockIntersectionObserver;

    userApi.getDashboardPreferences.mockResolvedValue({
      data: { success: true, dashboardPreferences: null },
    });
    userApi.updateDashboardPreferences.mockResolvedValue({
      data: { success: true },
    });
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
  });

  it("renders all admin feature cards in the drag grid without a narrow contributors rail (#712)", async () => {
    render(
      <MemoryRouter>
        <AppContent.Provider value={{ userData: mockUserData }}>
          <Dashboard />
        </AppContent.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("responsive-grid")).toBeInTheDocument();
    });

    expect(screen.getByText("dashboard.uploadMeetings")).toBeInTheDocument();
    expect(screen.getByText("dashboard.meetingEventHub")).toBeInTheDocument();
    expect(screen.getByText("dashboard.aiSummarization")).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.policiesRepository"),
    ).toBeInTheDocument();
    expect(screen.getByText("dashboard.reportsAnalytics")).toBeInTheDocument();
    expect(screen.getByTestId("top-contributors")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Organization Engagement"),
    ).toBeInTheDocument();
  });
});
