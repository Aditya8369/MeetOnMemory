import { collectHealth } from "../config/health.js";

const startedAt = Date.now();

/**
 * Maps internal dependency probe results to public-facing service status.
 * Does not expose raw error details or infrastructure identifiers.
 *
 * @param {{ status?: string, latencyMs?: number, required?: boolean }} dep
 * @returns {{ status: string, latencyMs: number|null, message?: string }}
 */
const mapDependencyStatus = (dep) => {
  if (!dep) {
    return { status: "unknown", latencyMs: null };
  }

  switch (dep.status) {
    case "up":
      return {
        status: "operational",
        latencyMs: typeof dep.latencyMs === "number" ? dep.latencyMs : null,
      };
    case "degraded":
      return {
        status: "degraded",
        latencyMs: typeof dep.latencyMs === "number" ? dep.latencyMs : null,
        message: "Operating with reduced capability",
      };
    case "disabled":
      return {
        status: "unknown",
        latencyMs: null,
        message: "Not configured",
      };
    case "down":
      return {
        status: "outage",
        latencyMs: null,
        message: "Service unavailable",
      };
    default:
      return { status: "unknown", latencyMs: null };
  }
};

/**
 * Maps aggregate health status to a public platform status label.
 * @param {string} healthStatus
 * @returns {"operational"|"degraded"|"outage"|"unknown"}
 */
const mapOverallStatus = (healthStatus) => {
  switch (healthStatus) {
    case "UP":
      return "operational";
    case "DEGRADED":
      return "degraded";
    case "DOWN":
      return "outage";
    default:
      return "unknown";
  }
};

/**
 * Builds the sanitized public platform status payload used by the Status page.
 * Reuses {@link collectHealth} — the same dependency probes as /health.
 *
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export const getPublicPlatformStatus = async (options = {}) => {
  const health = await collectHealth(options);
  const overallStatus = mapOverallStatus(health.status);

  const mongo = mapDependencyStatus(health.dependencies?.mongodb);
  const redis = mapDependencyStatus(health.dependencies?.redis);

  const apiStatus =
    overallStatus === "outage"
      ? "outage"
      : overallStatus === "degraded"
        ? "degraded"
        : overallStatus === "operational"
          ? "operational"
          : "unknown";

  const services = [
    {
      id: "api",
      name: "API & Auth Gateway",
      description: "Node/Express server endpoint",
      monitored: true,
      status: apiStatus,
      latencyMs: null,
    },
    {
      id: "mongodb",
      name: "Database",
      description: "MongoDB primary datastore",
      monitored: true,
      ...mongo,
    },
    {
      id: "redis",
      name: "Cache & Real-time Support",
      description: "Redis cache and pub/sub layer",
      monitored: true,
      ...redis,
    },
    {
      id: "webApp",
      name: "Web Application",
      description: "React client platform",
      monitored: false,
      status: "unknown",
      latencyMs: null,
      message: "Server-side monitoring not configured",
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
    {
      id: "vectorDb",
      name: "Vector Storage",
      description: "Semantic indexing layer",
      monitored: false,
      status: "unknown",
      latencyMs: null,
      message: "Monitoring not configured",
    },
    {
      id: "webSocket",
      name: "Live Editor Sync",
      description: "WebSocket collaborative hub",
      monitored: false,
      status: "unknown",
      latencyMs: null,
      message: "Monitoring not configured",
    },
    {
      id: "storage",
      name: "Media CDN Storage",
      description: "Audio and video recordings storage",
      monitored: false,
      status: "unknown",
      latencyMs: null,
      message: "Monitoring not configured",
    },
  ];

  return {
    success: true,
    status: overallStatus,
    ready: health.ready,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    services,
    incidentsAvailable: false,
    maintenanceAvailable: false,
    regionalMonitoringAvailable: false,
  };
};

export default getPublicPlatformStatus;
