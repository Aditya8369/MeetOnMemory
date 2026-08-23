import { describe, it, expect } from "vitest";
import { buildBadgeCatalogEntry } from "../utils/badgeCatalog.js";

describe("buildBadgeCatalogEntry (Issue #2066)", () => {
  const badge = {
    _id: "b1",
    name: "Punctual Pro",
    description: "Earn 100 points",
    iconUrl: "",
    tier: "Silver",
    criteria: { type: "points", threshold: 100 },
  };

  it("marks badge earned with full progress", () => {
    const entry = buildBadgeCatalogEntry(badge, {
      totalPoints: 150,
      unlockedBadges: [{ badge: "b1", unlockedAt: "2026-01-01" }],
    });
    expect(entry.earned).toBe(true);
    expect(entry.progress.percent).toBe(100);
  });

  it("computes in-progress percent for locked points badges", () => {
    const entry = buildBadgeCatalogEntry(badge, {
      totalPoints: 40,
      unlockedBadges: [],
    });
    expect(entry.earned).toBe(false);
    expect(entry.progress).toEqual({
      current: 40,
      target: 100,
      percent: 40,
    });
  });

  it("caps progress at 100 when points exceed threshold but not unlocked yet", () => {
    const entry = buildBadgeCatalogEntry(badge, {
      totalPoints: 250,
      unlockedBadges: [],
    });
    expect(entry.progress.percent).toBe(100);
    expect(entry.earned).toBe(false);
  });
});
