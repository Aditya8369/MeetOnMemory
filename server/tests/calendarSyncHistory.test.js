import { describe, it, expect } from "vitest";
import {
  formatSyncFailureMessage,
  isAuthSyncFailure,
  pushSyncHistory,
  MAX_SYNC_HISTORY,
} from "../utils/calendarSyncHistory.js";

describe("calendarSyncHistory (Issue #2053)", () => {
  it("formats token expiry as reconnect guidance", () => {
    expect(formatSyncFailureMessage(new Error("invalid_grant"))).toMatch(
      /reconnect/i,
    );
    expect(isAuthSyncFailure(new Error("Token expired"))).toBe(true);
  });

  it("prepends history and caps length", () => {
    const connection = { syncHistory: [] };
    for (let i = 0; i < MAX_SYNC_HISTORY + 5; i += 1) {
      pushSyncHistory(connection, {
        status: i % 2 === 0 ? "success" : "error",
        message: `attempt-${i}`,
        syncedCount: i,
        trigger: "manual",
      });
    }
    expect(connection.syncHistory).toHaveLength(MAX_SYNC_HISTORY);
    expect(connection.syncHistory[0].message).toBe(
      `attempt-${MAX_SYNC_HISTORY + 4}`,
    );
  });
});
