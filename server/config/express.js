import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./corsOptions.js";
import {
  csrfProtectionMiddleware,
  csrfTokenProvider, // eslint-disable-line no-unused-vars
  csrfErrorHandler,
} from "../middleware/csrfProtection.js";
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

// Import webhook routes that bypass CSRF
import webhookRoutes from "../routes/webhookRoutes.js";
import slackRoutes from "../routes/slackRoutes.js";
import { slackWebhookParser } from "../middleware/slackWebhookParser.js";
import publicSharedRoutes from "../routes/publicSharedRoutes.js";

export function configureExpress(app) {
  // Trust proxy for Render/Vercel
  app.set("trust proxy", 1);

  // ==========================================
  // SECURITY HEADERS + REQUEST CORRELATION (Issue #979)
  //   Registered first so *every* response carries them, including the ones
  //   produced by the Slack/webhook routes mounted below and by error handlers.
  // ==========================================
  configureSecurity(app);
  app.use(requestContext());

  // MIDDLEWARES
  app.use(cors(corsOptions));

  // ==========================================
  // 0. SLACK WEBHOOKS (raw body before JSON parse)
  //    Slack signature verification requires the original raw payload.
  //    Mount these parsers before the global body parsers so `req.rawBody`
  //    is captured. Also bypasses CSRF (Slack authenticates via signing secret).
  // ==========================================
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

  // ==========================================
  // 1. BYPASSED ROUTES (No CSRF Protection)
  //    External services authenticate via their own mechanisms.
  // ==========================================
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/public/shared", publicSharedRoutes);

  // ==========================================
  // 2. COOKIES & CSRF (Global for all remaining routes)
  // ==========================================
  app.use(cookieParser());
  app.use(csrfProtectionMiddleware);

  // CSRF token provider
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // Health endpoints — registered BEFORE the global rate limiter so keep-alive
  // pings (e.g. from the GitHub Actions cron job) and orchestrator probes are
  // never blocked. A rate-limited readiness probe would report an instance as
  // unhealthy purely because it was being polled.
  //
  // Issue #979: this replaces a static handler that returned `200 UP`
  // unconditionally — even with MongoDB down — with real dependency checks.
  configureHealthEndpoints(app);

  // GLOBAL RATE LIMITER
  app.use(globalLimiter);
}

export function configureErrorHandling(app) {
  // CSRF ERROR HANDLER
  app.use(csrfErrorHandler);
  // ERROR HANDLER
  app.use(errorHandler);
}
