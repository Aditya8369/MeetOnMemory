/**
 * Issue #1401 — Recap History API route registration.
 *
 * Regression: `GET /history/deliveries` must be registered as a static path
 * *before* `/:organizationId`, mounted once under `/api/recap-schedule`, and
 * wired to `getDeliveryHistory` (not `getSchedule`).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("openai", () => ({
  default: class OpenAI {},
}));

import routes from "../routes/index.js";
import recapScheduleRoutes from "../routes/recapScheduleRoutes.js";
import {
  getDeliveryHistory,
  getSchedule,
  retryDelivery,
} from "../controllers/recapScheduleController.js";

const getRouterStack = (router) => router?.stack || [];

const findMountedLayer = (parentRouter, mountPath) =>
  getRouterStack(parentRouter).find(
    (layer) =>
      layer.name === "router" &&
      typeof layer.match === "function" &&
      layer.match(mountPath),
  );

const listRouteLayers = (router) =>
  getRouterStack(router).filter((layer) => layer.route);

describe("Recap History route registration (#1401)", () => {
  it("mounts recap-schedule routes exactly once on the central router", () => {
    const matches = getRouterStack(routes).filter(
      (layer) =>
        typeof layer.match === "function" && layer.match("/api/recap-schedule"),
    );
    expect(matches.length).toBe(1);
  });

  it("registers GET /history/deliveries on the recap-schedule router", () => {
    const historyRoute = listRouteLayers(recapScheduleRoutes).find(
      (layer) =>
        layer.route?.path === "/history/deliveries" && layer.route.methods?.get,
    );

    expect(historyRoute).toBeDefined();
    expect(
      historyRoute.route.stack.some((s) => s.handle === getDeliveryHistory),
    ).toBe(true);
  });

  it("registers history before /:organizationId so it is not shadowed", () => {
    const layers = listRouteLayers(recapScheduleRoutes);
    const historyIdx = layers.findIndex(
      (l) => l.route?.path === "/history/deliveries",
    );
    const orgIdx = layers.findIndex(
      (l) => l.route?.path === "/:organizationId" && l.route.methods?.get,
    );

    expect(historyIdx).toBeGreaterThanOrEqual(0);
    expect(orgIdx).toBeGreaterThanOrEqual(0);
    expect(historyIdx).toBeLessThan(orgIdx);
  });

  it("wires GET /:organizationId to getSchedule (not history)", () => {
    const orgGet = listRouteLayers(recapScheduleRoutes).find(
      (l) => l.route?.path === "/:organizationId" && l.route.methods?.get,
    );
    expect(orgGet).toBeDefined();
    expect(orgGet.route.stack.some((s) => s.handle === getSchedule)).toBe(true);
    expect(
      orgGet.route.stack.some((s) => s.handle === getDeliveryHistory),
    ).toBe(false);
  });

  it("registers POST /retry/:deliveryId once", () => {
    const retryRoutes = listRouteLayers(recapScheduleRoutes).filter(
      (l) => l.route?.path === "/retry/:deliveryId" && l.route.methods?.post,
    );
    expect(retryRoutes).toHaveLength(1);
    expect(
      retryRoutes[0].route.stack.some((s) => s.handle === retryDelivery),
    ).toBe(true);
  });

  it("central mount exposes the nested history path via /api/recap-schedule", () => {
    const layer = findMountedLayer(routes, "/api/recap-schedule");
    expect(layer).toBeDefined();
    expect(layer.handle).toBe(recapScheduleRoutes);
  });

  it("controller exports required for history wiring are functions", () => {
    expect(typeof getDeliveryHistory).toBe("function");
    expect(typeof getSchedule).toBe("function");
    expect(typeof retryDelivery).toBe("function");
  });
});
