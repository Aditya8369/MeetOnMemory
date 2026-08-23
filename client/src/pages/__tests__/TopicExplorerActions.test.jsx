import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import TopicExplorer from "../TopicExplorer.jsx";
import apiClient from "../../services/apiClient.js";
import AppContent from "../../context/AppContent.js";

// Mock Navbar
vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock apiClient
vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock recharts
vi.mock("recharts", () => ({
  ScatterChart: ({ children }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: ({ onClick, data }) => (
    <div data-testid="scatter-layer">
      {data?.map((d) => (
        <button
          key={d._id}
          data-testid={`scatter-bubble-${d._id}`}
          onClick={() => onClick && onClick({ payload: d })}
        >
          {d.name}
        </button>
      ))}
    </div>
  ),
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Cell: () => null,
}));

describe("TopicExplorer Extract, Merge, and Delete Actions (#2028)", () => {
  const mockUserContext = {
    userData: {
      _id: "u_1",
      organization: "org_123",
    },
  };

  const initialClusters = [
    {
      _id: "c_1",
      label: "Sprint Planning",
      meetingCount: 5,
      canonicalTopicNames: ["Sprint Goals", "Backlog Refinement"],
    },
    {
      _id: "c_2",
      label: "Architecture Review",
      meetingCount: 3,
      canonicalTopicNames: ["Database Sharding", "API Gateway"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.prompt = vi.fn();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AppContent.Provider value={mockUserContext}>
          <TopicExplorer />
        </AppContent.Provider>
      </BrowserRouter>,
    );

  it("extracts topics when clicking Extract Topics button", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: initialClusters },
    });
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, data: { newlyExtracted: 2 } },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("cluster-card-c_1")).toBeInTheDocument();
    });

    const extractBtn = screen.getByTestId("extract-topics-btn");
    expect(extractBtn).toBeInTheDocument();
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/topics/extract/org/org_123",
      );
    });
  });

  it("selects a cluster and displays details and actions", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: initialClusters },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("cluster-card-c_1")).toBeInTheDocument();
    });

    // Click on Sprint Planning card
    fireEvent.click(screen.getByTestId("cluster-card-c_1"));

    await waitFor(() => {
      expect(screen.getByTestId("rename-cluster-btn")).toBeInTheDocument();
      expect(screen.getByTestId("merge-cluster-btn")).toBeInTheDocument();
      expect(screen.getByTestId("delete-cluster-btn")).toBeInTheDocument();
    });
  });

  it("renames a cluster via prompt", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: initialClusters },
    });
    apiClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "c_1",
          label: "Updated Sprint Planning",
          meetingCount: 5,
          canonicalTopicNames: ["Sprint Goals"],
        },
      },
    });

    window.prompt.mockReturnValue("Updated Sprint Planning");

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("cluster-card-c_1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("cluster-card-c_1"));

    const renameBtn = await screen.findByTestId("rename-cluster-btn");
    fireEvent.click(renameBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/api/topics/clusters/c_1",
        { label: "Updated Sprint Planning" },
      );
    });
  });

  it("deletes a cluster with ConfirmModal", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: initialClusters },
    });
    apiClient.delete.mockResolvedValueOnce({
      data: { success: true, message: "Cluster deleted" },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("cluster-card-c_1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("cluster-card-c_1"));

    const deleteBtn = await screen.findByTestId("delete-cluster-btn");
    fireEvent.click(deleteBtn);

    // Confirm modal should appear
    await waitFor(() => {
      expect(screen.getByText("Delete Topic Cluster")).toBeInTheDocument();
    });

    // Click confirm button in ConfirmModal
    const confirmDeleteBtn = screen.getByRole("button", {
      name: /delete cluster/i,
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        "/api/topics/clusters/c_1",
      );
    });
  });

  it("merges a cluster into another destination cluster with confirmation", async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: initialClusters },
    });
    apiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "c_2",
          label: "Architecture Review",
          meetingCount: 8,
          canonicalTopicNames: ["Sprint Goals", "Database Sharding"],
        },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("cluster-card-c_1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("cluster-card-c_1"));

    const mergeBtn = await screen.findByTestId("merge-cluster-btn");
    fireEvent.click(mergeBtn);

    // Merge Selection Modal appears
    await waitFor(() => {
      expect(screen.getByText("Merge Topic Cluster")).toBeInTheDocument();
      expect(screen.getByTestId("confirm-merge-proceed-btn")).toBeInTheDocument();
    });

    // Click proceed
    fireEvent.click(screen.getByTestId("confirm-merge-proceed-btn"));

    // Final ConfirmModal appears
    await waitFor(() => {
      expect(
        screen.getByText("Confirm Topic Cluster Merge"),
      ).toBeInTheDocument();
    });

    const confirmMergeFinalBtn = screen.getByRole("button", {
      name: /merge clusters/i,
    });
    fireEvent.click(confirmMergeFinalBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/topics/clusters/c_1/merge",
        { targetClusterId: "c_2" },
      );
    });
  });
});
