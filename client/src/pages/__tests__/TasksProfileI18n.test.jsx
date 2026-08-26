import React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppContent from "../../context/AppContent.js";
import i18n from "../../i18n.js";
import Tasks from "../Tasks.jsx";
import Profile from "../Profile.jsx";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("../../components/RoleGate.jsx", () => ({
  default: ({ children }) => children,
}));

vi.mock("../../components/tasks/TaskFilterPanel", () => ({
  default: () => <div data-testid="task-filter-panel" />,
}));
vi.mock("../../components/tasks/TaskSortBar", () => ({
  default: () => <div data-testid="task-sort-bar" />,
}));
vi.mock("../../components/tasks/TaskCard", () => ({
  default: () => <div data-testid="task-card" />,
}));
vi.mock("../../components/tasks/TaskDetailsModal", () => ({
  default: () => null,
}));
vi.mock("../../components/meetings/Pagination", () => ({
  default: () => null,
}));

vi.mock("../../hooks/useTasks", () => ({
  default: () => ({
    loading: false,
    error: null,
    sortedTasks: [],
    hasActiveFilters: false,
    refetch: vi.fn(),
    sortBy: "createdAt",
    sortOrder: "desc",
    handleSort: vi.fn(),
    page: 1,
    totalPages: 1,
    setPage: vi.fn(),
    setSelectedTask: vi.fn(),
    selectedTask: null,
    updateTaskStatus: vi.fn(),
    toggleTaskReminder: vi.fn(),
  }),
}));

vi.mock("../../hooks/useRBAC.js", () => ({
  useRBAC: () => ({ hasPermission: () => false }),
}));

vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    request: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  return {
    default: {
      ...mockInstance,
      create: vi.fn(() => mockInstance),
    },
  };
});

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const renderTasks = () =>
  render(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  );

const renderProfile = () =>
  render(
    <MemoryRouter>
      <AppContent.Provider
        value={{
          userData: {
            name: "Alex Doe",
            email: "alex@example.com",
            role: "member",
            bio: "Hello",
            isAccountVerified: true,
            createdAt: "2025-03-01T00:00:00.000Z",
          },
          setUserData: vi.fn(),
        }}
      >
        <Profile />
      </AppContent.Provider>
    </MemoryRouter>,
  );

describe("Tasks and Profile i18n (#1661)", () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("updates Tasks page strings when the language changes", async () => {
    renderTasks();
    expect(
      screen.getByRole("heading", { name: "No action items yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Consolidate memories" }),
    ).toBeInTheDocument();

    await act(() => i18n.changeLanguage("hi"));

    expect(
      screen.getByRole("heading", { name: "अभी कोई एक्शन आइटम नहीं है" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "मेमोरी समेकित करें" }),
    ).toBeInTheDocument();
  });

  it("updates Profile page strings when the language changes", async () => {
    renderProfile();
    expect(
      screen.getByRole("heading", { name: "My Profile" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Email", { selector: "div" })).toBeInTheDocument();

    await act(() => i18n.changeLanguage("hi"));

    expect(
      screen.getByRole("heading", { name: "मेरी प्रोफ़ाइल" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ईमेल", { selector: "div" })).toBeInTheDocument();
  });
});
