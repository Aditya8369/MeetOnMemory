import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import KnowledgeGraph from "../KnowledgeGraph.jsx";
import AppContent from "../../context/AppContent.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockGraphData = {
  nodes: [
    {
      id: "meeting-1",
      label: "Q3 Planning",
      type: "meeting",
      properties: { id: "1", title: "Q3 Planning", date: "2026-08-20" },
    },
    {
      id: "decision-1",
      label: "Adopt Microservices",
      type: "decision",
      properties: { id: "1", text: "Adopt Microservices", status: "open" },
    },
  ],
  edges: [
    {
      source: "meeting-1",
      target: "decision-1",
      type: "produced",
      weight: 1,
    },
  ],
};

const mockAnalyticsData = {
  totalNodes: 2,
  totalEdges: 1,
  density: 0.5,
  averageDegree: 1,
  connectedComponents: 1,
  nodeCounts: { meeting: 1, decision: 1 },
  topInfluencers: [{ id: "meeting-1", label: "Q3 Planning", degree: 1 }],
};

const mockPathData = {
  length: 1,
  nodes: [
    { id: "meeting-1", label: "Q3 Planning", type: "meeting" },
    { id: "decision-1", label: "Adopt Microservices", type: "decision" },
  ],
  edges: [{ source: "meeting-1", target: "decision-1", type: "produced" }],
};

const mockEntityNeighborhoodData = {
  entity: {
    id: "meeting-1",
    label: "Q3 Planning",
    type: "meeting",
    properties: { id: "1", title: "Q3 Planning" },
  },
  relationships: [
    { source: "meeting-1", target: "decision-1", type: "produced" },
  ],
  relatedEntities: [
    {
      id: "decision-1",
      label: "Adopt Microservices",
      type: "decision",
      properties: { id: "1" },
    },
  ],
};

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes("/api/graph/organization")) {
        return Promise.resolve({ data: mockGraphData });
      }
      if (url.includes("/api/graph/analytics")) {
        return Promise.resolve({ data: mockAnalyticsData });
      }
      if (url.includes("/api/graph/path")) {
        return Promise.resolve({ data: mockPathData });
      }
      if (url.includes("/api/graph/entity")) {
        return Promise.resolve({ data: mockEntityNeighborhoodData });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
  DEFAULT_TIMEOUT_MS: 30000,
}));

describe("KnowledgeGraph Advanced UI Features (#1892)", () => {
  const mockUserData = {
    name: "Alex Smith",
    organization: "60c72b2f9b1d8b2bad000001",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation tabs and switches between Graph View, Pathfinder, and Analytics", async () => {
    render(
      <BrowserRouter>
        <AppContent.Provider value={{ userData: mockUserData }}>
          <KnowledgeGraph />
        </AppContent.Provider>
      </BrowserRouter>,
    );

    // Wait for graph loading
    await waitFor(() => {
      expect(screen.getByText("Knowledge Graph")).toBeDefined();
    });

    expect(screen.getByRole("button", { name: /graph view/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /pathfinder/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /analytics/i })).toBeDefined();

    // Switch to Pathfinder tab
    fireEvent.click(screen.getByRole("button", { name: /pathfinder/i }));
    expect(screen.getByText("Interactive Node Pathfinder")).toBeDefined();
    expect(screen.getByRole("button", { name: /find path/i })).toBeDefined();

    // Switch to Analytics tab
    fireEvent.click(screen.getByRole("button", { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText("Total Nodes")).toBeDefined();
      expect(screen.getByText("Total Relationships")).toBeDefined();
    });
  });

  it("finds path between nodes in Pathfinder tab", async () => {
    render(
      <BrowserRouter>
        <AppContent.Provider value={{ userData: mockUserData }}>
          <KnowledgeGraph />
        </AppContent.Provider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Knowledge Graph")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /pathfinder/i }));

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "meeting-1" } });
    fireEvent.change(inputs[1], { target: { value: "decision-1" } });

    fireEvent.click(screen.getByRole("button", { name: /find path/i }));

    await waitFor(() => {
      expect(screen.getByText(/Path Finding Result/i)).toBeDefined();
    });
  });
});
