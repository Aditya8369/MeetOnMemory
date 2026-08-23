/** Max sync history entries kept per calendar connection (Issue #2053). */
export const MAX_SYNC_HISTORY = 20;

/**
 * Build an actionable sync failure message for the UI.
 */
export const formatSyncFailureMessage = (error) => {
  const raw = String(error?.message || error || "Calendar sync failed.");
  if (/invalid_grant|token.*expir|unauthorized|401|needs.?reauth/i.test(raw)) {
    return "Calendar access expired. Reconnect the provider and try Sync now again.";
  }
  if (/rate.?limit|429|quota/i.test(raw)) {
    return "Provider rate limit hit. Wait a few minutes, then try Sync now.";
  }
  if (/network|ECONN|ETIMEDOUT|ENOTFOUND/i.test(raw)) {
    return "Could not reach the calendar provider. Check your connection and try again.";
  }
  return raw.slice(0, 300);
};

export const isAuthSyncFailure = (error) =>
  /invalid_grant|token.*expir|unauthorized|401|needs.?reauth/i.test(
    String(error?.message || error || ""),
  );

/**
 * Prepend a sync attempt onto the connection's history (mutates doc).
 */
export const pushSyncHistory = (connection, entry) => {
  const next = {
    at: entry.at || new Date(),
    status: entry.status,
    message: String(entry.message || "").slice(0, 500),
    syncedCount: entry.syncedCount || 0,
    trigger: entry.trigger === "manual" ? "manual" : "cron",
  };
  const history = Array.isArray(connection.syncHistory)
    ? connection.syncHistory
    : [];
  connection.syncHistory = [next, ...history].slice(0, MAX_SYNC_HISTORY);
  return next;
};
