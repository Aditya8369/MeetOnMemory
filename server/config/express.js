import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./corsOptions.js";
import { globalLimiter } from "../middleware/rateLimiter.js";
import errorHandler from "../middleware/errorHandler.js";

// Import webhook routes (external auth — Slack signing secret / shared passcodes)
import webhookRoutes from "../routes/webhookRoutes.js";
import slackRoutes from "../routes/slackRoutes.js";
import { slackWebhookParser } from "../middleware/slackWebhookParser.js";
import publicSharedRoutes from "../routes/publicSharedRoutes.js";

export function configureExpress(app) {
  app.set("trust proxy", 1);

  app.use(cors(corsOptions));

  // Slack webhooks need raw body before JSON parse
  app.use("/api/slack", slackWebhookParser, slackRoutes);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/public/shared", publicSharedRoutes);

  // Cookies still used for shared-link access tokens (not user sessions)
  app.use(cookieParser());

  app.get(["/health", "/api/health"], (req, res) => {
    res.status(200).json({
      status: "UP",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  });

  app.use(globalLimiter);
}

export function configureErrorHandling(app) {
  app.use(errorHandler);
}
