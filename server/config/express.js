import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./corsOptions.js";
import { globalLimiter } from "../middleware/rateLimiter.js";
import errorHandler from "../middleware/errorHandler.js";
import { configureSecurity } from "./security.js";
import { configureHealthEndpoints } from "./health.js";
import { requestContext } from "../middleware/requestContext.js";

/**
 * Body-parser limits (Issue #979).
 *
 * These used to be `50mb` globally, so *every* endpoint — login, notification
 * preferences, comment creation — would buffer and JSON-parse a 50 MB body
 * before any handler, validator or auth check ran. A handful of concurrent
 * large posts to an unauthenticated route is enough to exhaust heap on a small
 * instance. The large limit is needed by a few upload/transcript routes, not by
 * the entire API surface.
 */
const BODY_LIMIT = process.env.BODY_LIMIT || "2mb";
const LARGE_BODY_LIMIT = process.env.LARGE_BODY_LIMIT || "50mb";

/**
 * Routes that legitimately receive large payloads (base64 audio, long
 * transcripts, document content). Kept as an explicit allow-list so raising a
 * limit is a visible decision rather than a global default.
 */
const LARGE_BODY_ROUTES = [
  "/api/meetings",
  "/api/transcripts",
  "/api/sessions",
  "/api/policies",
];

// Import webhook routes (external auth — Slack signing secret / shared passcodes)
import webhookRoutes from "../routes/webhookRoutes.js";
import slackRoutes from "../routes/slackRoutes.js";
import { slackWebhookParser } from "../middleware/slackWebhookParser.js";
import publicSharedRoutes from "../routes/publicSharedRoutes.js";

export function configureExpress(app) {
  app.set("trust proxy", 1);

  // ==========================================
  // SECURITY HEADERS + REQUEST CORRELATION (Issue #979)
  //   Registered first so *every* response carries them, including the ones
  //   produced by the Slack/webhook routes mounted below and by error handlers.
  // ==========================================
  configureSecurity(app);
  app.use(requestContext());

  app.use(cors(corsOptions));

  // Slack webhooks need raw body before JSON parse
  app.use("/api/slack", slackWebhookParser, slackRoutes);

  // Large limits only where they're actually needed (see LARGE_BODY_ROUTES).
  app.use(LARGE_BODY_ROUTES, express.json({ limit: LARGE_BODY_LIMIT }));
  app.use(
    LARGE_BODY_ROUTES,
    express.urlencoded({ extended: true, limit: LARGE_BODY_LIMIT }),
  );

  // Everything else gets a limit sized for ordinary JSON payloads. Express's
  // body parsers are no-ops once a body has already been parsed, so the routes
  // above keep their larger allowance.
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/public/shared", publicSharedRoutes);

  // Cookies still used for shared-link access tokens (not user sessions)
  app.use(cookieParser());

  // Health endpoints — registered BEFORE the global rate limiter so keep-alive
  // pings (e.g. from the GitHub Actions cron job) and orchestrator probes are
  // never blocked. A rate-limited readiness probe would report an instance as
  // unhealthy purely because it was being polled.
  //
  // Issue #979: this replaces a static handler that returned `200 UP`
  // unconditionally — even with MongoDB down — with real dependency checks.
  configureHealthEndpoints(app);

  app.use(globalLimiter);
}

export function configureErrorHandling(app) {
  app.use(errorHandler);
}
