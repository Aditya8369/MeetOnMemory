import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Status from "../Status";
import * as statusApi from "../../services/statusApi.js";
import { STATUS_POLL_INTERVAL_SEC } from "../../services/statusApi.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

const operationalPayload = {
  success: true,
  status: "operational",
  ready: true,
  timestamp: "2026-08-18T12:00:00.000Z",
  uptimeSeconds: 3600,
  incidentsAvailable: false,
  maintenanceAvailable: false,
  regionalMonitoringAvailable: false,
  services: [
    {
      id: "api",
      name: "API & Auth Gateway",
      description: "Node/Express server endpoint",
      monitored: true,
      status: "operational",
      latencyMs: null,
    },
    {
      id: "mongodb",
      name: "Database",
      description: "MongoDB primary datastore",
      monitored: true,
      status: "operational",
      latencyMs: 18,
    },
    {
      id: "redis",
      name: "Cache & Real-time Support",
      description: "Redis cache and pub/sub layer",
      monitored: true,
      status: "operational",
      latencyMs: 7,
    },
    {
      id: "geminiAi",
      name: "AI Gemini Summaries",
      description: "Google Gemini LLM workflows",
      monitored: false,
      status: "unknown",
      latencyMs: null,
      message: "Monitoring not configured",
    },
  ],
};

describe("Status page live health metrics (#1789)", () => {
  beforeEach(() => {
    vi.spyOn(statusApi, "fetchPlatformStatus");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows operational status after a successful health check", async () => {
    statusApi.fetchPlatformStatus.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      latencyMs: 42,
      data: operationalPayload,
    });

    render(<Status />);

    await waitFor(() => {
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Database" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("42ms").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18ms").length).toBeGreaterThan(0);
    expect(screen.getByText("Monitoring not configured")).toBeInTheDocument();
  });

  it("shows outage status when the status endpoint reports an outage", async () => {
    statusApi.fetchPlatformStatus.mockResolvedValue({
      ok: false,
      httpStatus: 503,
      latencyMs: 55,
      data: {
        ...operationalPayload,
        success: true,
        status: "outage",
        ready: false,
        services: operationalPayload.services.map((service) =>
          service.id === "mongodb"
            ? { ...service, status: "outage", latencyMs: null }
            : service,
        ),
      },
    });

    render(<Status />);

    await waitFor(() => {
      expect(screen.getByText("System Outage")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("All Systems Operational"),
    ).not.toBeInTheDocument();
  });

  it("shows degraded status for partial dependency failure", async () => {
    statusApi.fetchPlatformStatus.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      latencyMs: 60,
      data: {
        ...operationalPayload,
        status: "degraded",
        services: operationalPayload.services.map((service) =>
          service.id === "redis"
            ? {
                ...service,
                status: "degraded",
                message: "Operating with reduced capability",
              }
            : service,
        ),
      },
    });

    render(<Status />);

    await waitFor(() => {
      expect(
        screen.getByText("Partial System Degradation"),
      ).toBeInTheDocument();
    });
  });

  it("shows an error state when the status request fails", async () => {
    statusApi.fetchPlatformStatus.mockRejectedValue(new Error("Network error"));

    render(<Status />);

    await waitFor(() => {
      expect(screen.getByText("Status Unavailable")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Retry Health Check/i }),
    ).toBeInTheDocument();
  });

  it("retries health checks when the retry button is clicked", async () => {
    statusApi.fetchPlatformStatus
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        httpStatus: 200,
        latencyMs: 33,
        data: operationalPayload,
      });

    render(<Status />);

    await waitFor(() => {
      expect(screen.getByText("Status Unavailable")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Retry Health Check/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
    });

    expect(statusApi.fetchPlatformStatus).toHaveBeenCalledTimes(2);
  });

  it("does not apply stale responses when a newer request is in flight", async () => {
    vi.useFakeTimers();

    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    statusApi.fetchPlatformStatus
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce({
        ok: true,
        httpStatus: 200,
        latencyMs: 25,
        data: operationalPayload,
      });

    render(<Status />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_SEC * 1000);
    });

    expect(statusApi.fetchPlatformStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByText("All Systems Operational")).toBeInTheDocument();

    await act(async () => {
      resolveFirst({
        ok: false,
        httpStatus: 503,
        latencyMs: 999,
        data: { ...operationalPayload, status: "outage" },
      });
      await firstPromise;
    });

    expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
    expect(screen.queryByText("System Outage")).not.toBeInTheDocument();
  });

  it("shows honest unavailable states instead of fabricated regional or incident data", async () => {
    statusApi.fetchPlatformStatus.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      latencyMs: 20,
      data: operationalPayload,
    });

    render(<Status />);

    await waitFor(() => {
      expect(
        screen.getByText(/Regional latency monitoring is not configured/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Incident history unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No maintenance scheduling API is available/i),
    ).toBeInTheDocument();
  });
});
