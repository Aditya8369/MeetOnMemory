import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DependencyManager from "../DependencyManager.jsx";
import { actionItemDependencyApi, knowledgeApi } from "../../services";
import { toast } from "react-toastify";

vi.mock("../../services", () => ({
  actionItemDependencyApi: {
    getDependencies: vi.fn(),
    addDependency: vi.fn(),
    removeDependency: vi.fn(),
  },
  knowledgeApi: {
    getActionItems: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockTask = {
  id: "task-main",
  title: "Main Feature Task",
  status: "open",
};

const mockDependenciesData = {
  blockers: [
    {
      _id: "blocker-1",
      text: "Setup Database Schema",
      owner: "Alice",
      status: "open",
    },
    {
      _id: "blocker-2",
      text: "Configure OAuth Provider",
      owner: "Bob",
      status: "resolved",
    },
  ],
  blocking: [
    {
      _id: "dependent-1",
      text: "Deploy to Production",
      owner: "Charlie",
      status: "open",
    },
  ],
};

describe("DependencyManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionItemDependencyApi.getDependencies.mockResolvedValue({
      data: { success: true, data: mockDependenciesData },
    });
  });

  it("renders null when task is null or has no id", () => {
    const { container } = render(<DependencyManager task={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("fetches and displays blockers and dependents", async () => {
    render(<DependencyManager task={mockTask} />);

    expect(screen.getByTestId("dependency-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Setup Database Schema")).toBeInTheDocument();
    });

    expect(screen.getByText("Configure OAuth Provider")).toBeInTheDocument();
    expect(screen.getByText("Deploy to Production")).toBeInTheDocument();
    expect(screen.getByText("Task is Blocked")).toBeInTheDocument();
    expect(actionItemDependencyApi.getDependencies).toHaveBeenCalledWith(
      "task-main",
    );
  });

  it("shows no active blockers message when blockers list is empty", async () => {
    actionItemDependencyApi.getDependencies.mockResolvedValue({
      data: { success: true, data: { blockers: [], blocking: [] } },
    });

    render(<DependencyManager task={mockTask} />);

    await waitFor(() => {
      expect(screen.getByText(/no active blockers/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Task is Blocked")).not.toBeInTheDocument();
  });

  it("allows searching and adding a blocker successfully", async () => {
    knowledgeApi.getActionItems.mockResolvedValue({
      data: {
        success: true,
        actionItems: [
          {
            _id: "candidate-1",
            text: "Candidate Blocker Item",
            owner: "Dave",
            status: "open",
          },
          {
            _id: "task-main",
            text: "Self Task",
            owner: "Alice",
            status: "open",
          },
          {
            _id: "blocker-1",
            text: "Already Linked Blocker",
            owner: "Alice",
            status: "open",
          },
        ],
      },
    });
    actionItemDependencyApi.addDependency.mockResolvedValue({
      data: { success: true },
    });

    render(<DependencyManager task={mockTask} />);

    await waitFor(() => {
      expect(screen.getByText("Setup Database Schema")).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: /add blocker/i });
    fireEvent.click(addBtn);

    const searchInput = screen.getByPlaceholderText(
      "Search for a task to block this one...",
    );
    fireEvent.change(searchInput, { target: { value: "Candidate" } });

    await waitFor(() => {
      expect(screen.getByText("Candidate Blocker Item")).toBeInTheDocument();
    });

    // Verify self and existing blocker are excluded from candidates
    expect(screen.queryByText("Self Task")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Already Linked Blocker"),
    ).not.toBeInTheDocument();

    // Click candidate to add
    fireEvent.click(screen.getByText("Candidate Blocker Item"));

    await waitFor(() => {
      expect(actionItemDependencyApi.addDependency).toHaveBeenCalledWith(
        "task-main",
        "candidate-1",
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Dependency added");
  });

  it("displays cycle error message when circular dependency is detected", async () => {
    knowledgeApi.getActionItems.mockResolvedValue({
      data: {
        success: true,
        actionItems: [
          {
            _id: "candidate-cycle",
            text: "Cycle Causing Task",
            owner: "Eve",
            status: "open",
          },
        ],
      },
    });
    actionItemDependencyApi.addDependency.mockRejectedValue({
      response: {
        data: {
          message:
            "Cannot add dependency: It would create a circular dependency loop.",
        },
      },
    });

    render(<DependencyManager task={mockTask} />);

    await waitFor(() => {
      expect(screen.getByText("Setup Database Schema")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add blocker/i }));
    const searchInput = screen.getByPlaceholderText(
      "Search for a task to block this one...",
    );
    fireEvent.change(searchInput, { target: { value: "Cycle" } });

    await waitFor(() => {
      expect(screen.getByText("Cycle Causing Task")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cycle Causing Task"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Cannot add dependency: It would create a circular dependency loop/i,
      ),
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      "Cannot add dependency: It would create a circular dependency loop.",
    );
  });

  it("allows removing a blocker", async () => {
    actionItemDependencyApi.removeDependency.mockResolvedValue({
      data: { success: true },
    });

    render(<DependencyManager task={mockTask} />);

    await waitFor(() => {
      expect(screen.getByText("Setup Database Schema")).toBeInTheDocument();
    });

    const removeBlockerBtn = screen.getByRole("button", {
      name: /remove blocker setup database schema/i,
    });
    fireEvent.click(removeBlockerBtn);

    await waitFor(() => {
      expect(actionItemDependencyApi.removeDependency).toHaveBeenCalledWith(
        "task-main",
        "blocker-1",
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Dependency removed");
  });

  it("allows removing a dependent", async () => {
    actionItemDependencyApi.removeDependency.mockResolvedValue({
      data: { success: true },
    });

    render(<DependencyManager task={mockTask} />);

    await waitFor(() => {
      expect(screen.getByText("Deploy to Production")).toBeInTheDocument();
    });

    const removeDependentBtn = screen.getByRole("button", {
      name: /remove dependent deploy to production/i,
    });
    fireEvent.click(removeDependentBtn);

    await waitFor(() => {
      expect(actionItemDependencyApi.removeDependency).toHaveBeenCalledWith(
        "dependent-1",
        "task-main",
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Dependency removed");
  });
});
