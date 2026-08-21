import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import FollowUpDashboard from "../FollowUpDashboard.jsx";
import apiClient from "../../services/apiClient.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="app-navbar">App Navbar</div>,
}));

vi.mock("../../components/tasks/TaskDetailsModal.jsx", () => ({
  default: ({ selectedTask, setSelectedTask }) =>
    selectedTask ? (
      <div data-testid="task-details-modal">
        <span>Modal: {selectedTask.title}</span>
        <button onClick={() => setSelectedTask(null)}>Close Modal</button>
      </div>
    ) : null,
}));

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAnalytics = {
  summary: {
    totalTasks: 10,
    completedTasks: 8,
    pendingTasks: 1,
    inProgressTasks: 1,
    overdueTasks: 0,
    completionRate: 80.0,
    avgTimeToCompletion: 2.5,
    overdueRate: 0.0,
    onTimeRate: 100.0,
  },
  trends: [
    { week: "W1", created: 5, completed: 4, overdue: 0 },
    { week: "W2", created: 5, completed: 4, overdue: 0 },
  ],
};

const mockTasks = [
  {
    _id: "task-101",
    title: "Implement Auth Flow",
    status: "pending",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    acknowledged: false,
    meeting: { title: "Sprint Planning", _id: "meet-1" },
    metadata: { priority: "high" },
  },
  {
    _id: "task-102",
    title: "Database Migration",
    status: "in-progress",
    deadline: new Date(Date.now() + 172800000).toISOString(),
    acknowledged: true,
    meeting: { title: "Architecture Review", _id: "meet-2" },
    metadata: { priority: "medium" },
  },
];

describe("FollowUpDashboard Page (#1875)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockImplementation((url) => {
      if (url === "/api/followup/analytics") {
        return Promise.resolve({ data: mockAnalytics });
      }
      if (url === "/api/followup/tasks") {
        return Promise.resolve({
          data: {
            tasks: mockTasks,
            pagination: { total: 2, totalPages: 1 },
          },
        });
      }
      if (url.startsWith("/api/followup/tasks/")) {
        return Promise.resolve({
          data: { task: mockTasks[0] },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("renders FollowUpDashboard header, Navbar, metrics, and tasks list", async () => {
    render(
      <MemoryRouter initialEntries={["/followup"]}>
        <Routes>
          <Route path="/followup" element={<FollowUpDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("app-navbar")).toBeInTheDocument();
    expect(screen.getByText("Follow-Up Dashboard")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Implement Auth Flow")).toBeInTheDocument();
      expect(screen.getByText("Database Migration")).toBeInTheDocument();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/followup/tasks", {
      params: { page: "1", limit: "20" },
    });
    expect(apiClient.get).toHaveBeenCalledWith("/api/followup/analytics");
  });

  it("filters tasks when clicking status filter buttons", async () => {
    render(
      <MemoryRouter initialEntries={["/followup"]}>
        <Routes>
          <Route path="/followup" element={<FollowUpDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Implement Auth Flow")).toBeInTheDocument();
    });

    const pendingFilterBtn = screen.getByRole("button", { name: /^pending$/i });
    fireEvent.click(pendingFilterBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/followup/tasks", {
        params: { page: "1", limit: "20", status: "pending" },
      });
    });
  });

  it("opens task detail modal on task card click and supports /followup/tasks/:id route", async () => {
    render(
      <MemoryRouter initialEntries={["/followup/tasks/task-101"]}>
        <Routes>
          <Route path="/followup" element={<FollowUpDashboard />} />
          <Route path="/followup/tasks/:id" element={<FollowUpDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-details-modal")).toBeInTheDocument();
      expect(
        screen.getByText("Modal: Implement Auth Flow"),
      ).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: /close modal/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByTestId("task-details-modal"),
      ).not.toBeInTheDocument();
    });
  });

  it("allows acknowledging a pending task", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={["/followup"]}>
        <Routes>
          <Route path="/followup" element={<FollowUpDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Acknowledge")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Acknowledge"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/followup/tasks/task-101/acknowledge",
      );
    });
  });
});
