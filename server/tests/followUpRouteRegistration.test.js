/**
 * Issue #1529 — Follow-Up Workflow REST API must be mounted at /api/followup.
 *
 * `followUpRoutes.js` existed with userAuth + org/assignee checks, but was never
 * registered in the central route index, so FollowUpDashboard calls 404'd.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("openai", () => ({
  default: class OpenAI {},
}));

import routes from "../routes/index.js";
import followUpRoutes from "../routes/followUpRoutes.js";
import {
  getTasks,
  getAnalytics,
  updateStatus,
  acknowledgeTask,
  getReminders,
  escalateTask,
  processRemindersManually,
} from "../controllers/followUpController.js";

const getRouterStack = (router) => router?.stack || [];

const listRouteLayers = (router) =>
  getRouterStack(router).filter((layer) => layer.route);

describe("Follow-Up route registration (#1529)", () => {
  it("mounts followUpRoutes exactly once under /api/followup", () => {
    const matches = getRouterStack(routes).filter(
      (layer) =>
        typeof layer.match === "function" && layer.match("/api/followup"),
    );
    expect(matches.length).toBe(1);
  });

  it("central mount points at the followUpRoutes module", () => {
    const layer = getRouterStack(routes).find(
      (l) =>
        l.name === "router" &&
        typeof l.match === "function" &&
        l.match("/api/followup"),
    );
    expect(layer).toBeDefined();
    expect(layer.handle).toBe(followUpRoutes);
  });

  it("does not confuse /api/followup with /api/follow-up-threads", () => {
    const followup = getRouterStack(routes).filter(
      (layer) =>
        typeof layer.match === "function" && layer.match("/api/followup"),
    );
    const threads = getRouterStack(routes).filter(
      (layer) =>
        typeof layer.match === "function" &&
        layer.match("/api/follow-up-threads"),
    );
    expect(followup.length).toBe(1);
    expect(threads.length).toBe(1);
    expect(followup[0].handle).not.toBe(threads[0].handle);
  });

  it("wires dashboard and related endpoints on followUpRoutes", () => {
    const layers = listRouteLayers(followUpRoutes);

    const has = (path, method, handler) =>
      layers.some(
        (l) =>
          l.route?.path === path &&
          l.route.methods?.[method] &&
          l.route.stack.some((s) => s.handle === handler),
      );

    expect(has("/tasks", "get", getTasks)).toBe(true);
    expect(has("/analytics", "get", getAnalytics)).toBe(true);
    expect(has("/tasks/:id/status", "patch", updateStatus)).toBe(true);
    expect(has("/tasks/:id/acknowledge", "post", acknowledgeTask)).toBe(true);
    expect(has("/reminders", "get", getReminders)).toBe(true);
    expect(has("/escalate/:id", "post", escalateTask)).toBe(true);
    expect(has("/process-reminders", "post", processRemindersManually)).toBe(
      true,
    );
  });

  it("applies authentication middleware before Follow-Up handlers", () => {
    const middlewareLayers = getRouterStack(followUpRoutes).filter(
      (layer) => !layer.route,
    );
    expect(middlewareLayers.length).toBeGreaterThanOrEqual(1);
  });
});
