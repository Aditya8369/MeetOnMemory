/**
 * Issue #1789 — public platform status endpoint.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import { configureHealthEndpoints } from "../config/health.js";
import { createStatusRoutes } from "../routes/statusRoutes.js";
import { getPublicPlatformStatus } from "../services/statusService.js";

const buildStatusApp = (healthOptions = {}) => {
  const app = express();
  configureHealthEndpoints(app, healthOptions);
  app.use("/api/status", createStatusRoutes(healthOptions));
  return app;
};

describe("Platform status API (#1789)", () => {
  describe("GET /api/status", () => {
    it("returns sanitized monitored services without internal error details", async () => {
      const app = buildStatusApp({
        mongoCheck: async () => ({
          status: "up",
          required: true,
          latencyMs: 14,
        }),
        redisCheck: async () => ({
          status: "up",
          required: false,
          latencyMs: 6,
        }),
      });

      const res = await request(app).get("/api/status");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("operational");
      expect(res.body.services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "api",
            monitored: true,
            status: "operational",
          }),
          expect.objectContaining({
            id: "mongodb",
            monitored: true,
            status: "operational",
            latencyMs: 14,
          }),
        ]),
      );

      const apiService = res.body.services.find((s) => s.id === "api");
      expect(apiService).not.toHaveProperty("detail");

      const aiService = res.body.services.find((s) => s.id === "geminiAi");
      expect(aiService).toMatchObject({
        monitored: false,
        status: "unknown",
        message: "Monitoring not configured",
      });

      expect(res.body).not.toHaveProperty("env");
      expect(res.body.incidentsAvailable).toBe(false);
      expect(res.body.regionalMonitoringAvailable).toBe(false);
    });

    it("returns 503 and outage status when a required dependency is down", async () => {
      const app = buildStatusApp({
        mongoCheck: async () => ({
          status: "down",
          required: true,
          detail: "disconnected",
        }),
        redisCheck: async () => ({ status: "up", required: false }),
      });

      const res = await request(app).get("/api/status");

      expect(res.status).toBe(503);
      expect(res.body.status).toBe("outage");
      expect(res.body.ready).toBe(false);
      expect(res.body.services.find((s) => s.id === "mongodb")).toMatchObject({
        status: "outage",
        message: "Service unavailable",
      });
      expect(
        res.body.services.find((s) => s.id === "mongodb"),
      ).not.toHaveProperty("detail");
    });

    it("reports degraded overall status when optional redis is degraded", async () => {
      const app = buildStatusApp({
        mongoCheck: async () => ({
          status: "up",
          required: true,
          latencyMs: 9,
        }),
        redisCheck: async () => ({
          status: "degraded",
          required: false,
          detail: "connection refused",
        }),
      });

      const res = await request(app).get("/api/status");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("degraded");
      expect(res.body.services.find((s) => s.id === "redis")).toMatchObject({
        status: "degraded",
      });
    });
  });

  describe("getPublicPlatformStatus", () => {
    it("never marks unmonitored integrations as operational", async () => {
      const result = await getPublicPlatformStatus({
        mongoCheck: async () => ({ status: "up", required: true }),
        redisCheck: async () => ({ status: "up", required: false }),
      });

      const unmonitored = result.services.filter(
        (service) => !service.monitored,
      );
      expect(unmonitored.length).toBeGreaterThan(0);
      unmonitored.forEach((service) => {
        expect(service.status).toBe("unknown");
      });
    });
  });
});
