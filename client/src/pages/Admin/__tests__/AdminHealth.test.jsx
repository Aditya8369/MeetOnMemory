import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminHealth from "../AdminHealth.jsx";
import { adminHealthApi } from "../../../services/adminHealthApi";

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("../../../components/Navbar.jsx", () => ({
  default: () => <nav>Navbar</nav>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../services/adminHealthApi", () => ({
  adminHealthApi: {
    getReport: vi.fn(),
  },
}));

describe("AdminHealth Component Tests (#2082)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders system health dashboard and detailed dependency cards", async () => {
    adminHealthApi.getReport.mockResolvedValue({
      data: {
        success: true,
        overallStatus: "UP",
        timestamp: "2026-08-22T10:00:00.000Z",
        uptimeSeconds: 7200,
        dependencies: {
          mongodb: {
            status: "up",
            latencyMs: 12,
            details: {
              host: "mongodb-instance-primary",
              name: "meet-on-memory-prod",
              collections: 15,
              objects: 450,
            },
          },
          redis: {
            status: "up",
            latencyMs: 3,
            details: {
              configured: true,
              usedMemory: "4.5M",
              connectedClients: 8,
            },
          },
          queues: {
            status: "operational",
            activeWorkersCount: 4,
            queuesCount: 12,
            queuesUp: 12,
            queuesDown: 0,
            queues: [
              {
                name: "ai-mom-generation",
                status: "operational",
                counts: {
                  waiting: 0,
                  active: 1,
                  delayed: 0,
                  failed: 2,
                  completed: 50,
                },
              },
            ],
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <AdminHealth />
      </MemoryRouter>,
    );

    // Verify title and main headers render
    expect(
      screen.getByText("Dependency Health & Diagnostics"),
    ).toBeInTheDocument();

    // Wait for the report to load and display system status
    await waitFor(() => {
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
    });

    // Check database card metrics
    expect(screen.getByText("MongoDB Database")).toBeInTheDocument();
    expect(screen.getByText("mongodb-instance-primary")).toBeInTheDocument();
    expect(screen.getByText("meet-on-memory-prod")).toBeInTheDocument();

    // Check Redis card metrics
    expect(screen.getByText("Redis Cache")).toBeInTheDocument();
    expect(screen.getByText("4.5M")).toBeInTheDocument();

    // Check Queues card metrics and background queues list
    expect(screen.getByText("BullMQ Queues")).toBeInTheDocument();
    expect(screen.getByText("ai-mom-generation")).toBeInTheDocument();
  });
});
