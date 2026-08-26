import { getBackendUrl } from "../config/backendConfig.js";

export const STATUS_REQUEST_TIMEOUT_MS = 8000;
export const STATUS_POLL_INTERVAL_SEC = 15;

/**
 * Fetches the public platform status from the backend.
 * Measures round-trip latency from the client for the API gateway service.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ ok: boolean, httpStatus: number, latencyMs: number, data: object }>}
 */
export async function fetchPlatformStatus({ signal } = {}) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    STATUS_REQUEST_TIMEOUT_MS,
  );

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(`${getBackendUrl()}/api/status`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const latencyMs = Math.round(performance.now() - startedAt);
    let data;

    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        status: "unknown",
        message: "Invalid status response",
        services: [],
      };
    }

    return {
      ok: response.ok,
      httpStatus: response.status,
      latencyMs,
      data,
    };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}

export default fetchPlatformStatus;
