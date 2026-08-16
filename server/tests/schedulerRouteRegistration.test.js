/**
 * Issue #1530 — Smart Scheduler route registration and API contract.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("openai", () => ({
  default: class OpenAI {},
}));

import routes from "../routes/index.js";
import schedulerRoutes from "../routes/scheduler.routes.js";
import {
  createProposal,
  getProposal,
  confirmProposal,
} from "../controllers/schedulerController.js";

const getRouterStack = (router) => router?.stack || [];
const listRouteLayers = (router) =>
  getRouterStack(router).filter((layer) => layer.route);

describe("Smart Scheduler route registration (#1530)", () => {
  it("mounts scheduler routes exactly once under /api/scheduler", () => {
    const matches = getRouterStack(routes).filter(
      (layer) =>
        typeof layer.match === "function" && layer.match("/api/scheduler"),
    );
    expect(matches.length).toBe(1);
  });

  it("central mount points at scheduler.routes", () => {
    const layer = getRouterStack(routes).find(
      (l) =>
        l.name === "router" &&
        typeof l.match === "function" &&
        l.match("/api/scheduler"),
    );
    expect(layer?.handle).toBe(schedulerRoutes);
  });

  it("registers propose, get, and confirm endpoints", () => {
    const layers = listRouteLayers(schedulerRoutes);

    const has = (path, method, handler) =>
      layers.some(
        (l) =>
          l.route?.path === path &&
          l.route.methods?.[method] &&
          l.route.stack.some((s) => s.handle === handler),
      );

    expect(has("/propose", "post", createProposal)).toBe(true);
    expect(has("/propose/:id", "get", getProposal)).toBe(true);
    expect(has("/propose/:id/confirm", "put", confirmProposal)).toBe(true);
  });
});
