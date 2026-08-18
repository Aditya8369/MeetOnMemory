import { getPublicPlatformStatus } from "../services/statusService.js";

/**
 * Factory for the GET /api/status handler so tests can inject dependency checks,
 * matching the pattern used by configureHealthEndpoints.
 *
 * @param {object} [healthOptions] - forwarded to collectHealth via getPublicPlatformStatus
 * @returns {import("express").RequestHandler}
 */
export const createGetPlatformStatusHandler = (healthOptions = {}) => {
  return async (req, res) => {
    try {
      const result = await getPublicPlatformStatus(healthOptions);
      const httpStatus = result.status === "outage" ? 503 : 200;
      return res.status(httpStatus).json(result);
    } catch (error) {
      console.error("Error building platform status:", error);
      return res.status(503).json({
        success: false,
        status: "unknown",
        ready: false,
        timestamp: new Date().toISOString(),
        message: "Unable to determine platform status",
        services: [],
        incidentsAvailable: false,
        maintenanceAvailable: false,
        regionalMonitoringAvailable: false,
      });
    }
  };
};

/** Default handler using live dependency probes. */
export const getPlatformStatus = createGetPlatformStatusHandler();

export default getPlatformStatus;
