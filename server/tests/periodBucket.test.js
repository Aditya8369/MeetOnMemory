import { describe, it, expect } from "vitest";

import {
  DEFAULT_GRANULARITY,
  PERIOD_GRANULARITIES,
  WEEK_START_DAY,
  comparePeriodKeys,
  groupByPeriod,
  periodKey,
  startOfPeriod,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  toValidDate,
} from "../utils/periodBucket.js";

/**
 * Issue #1453 — four trend endpoints bucketed records with the same
 * copy-pasted snippet, which mixed the local calendar with UTC:
 *
 *     weekStart.setDate(weekStart.getDate() - weekStart.getDay());  // local
 *     const weekKey = weekStart.toISOString().split("T")[0];        // UTC
 *
 * The point of this suite is that the bug was invisible under `TZ=UTC`, which
 * is why it survived four copies. So the tests assert timezone *independence*
 * directly: every key is checked against an instant, not against a local
 * calendar reading, and the regression case uses the exact timestamps from the
 * issue report.
 */

describe("toValidDate (#1453)", () => {
  it("accepts Dates, ISO strings and epoch numbers", () => {
    const iso = "2026-08-12T10:00:00.000Z";
    expect(toValidDate(new Date(iso)).toISOString()).toBe(iso);
    expect(toValidDate(iso).toISOString()).toBe(iso);
    expect(toValidDate(Date.parse(iso)).toISOString()).toBe(iso);
  });

  it("returns null rather than an Invalid Date", () => {
    // The previous code let these through and produced a literal "NaN-aN-aN"
    // bucket that several broken records would then share.
    expect(toValidDate(null)).toBeNull();
    expect(toValidDate(undefined)).toBeNull();
    expect(toValidDate("")).toBeNull();
    expect(toValidDate("not a date")).toBeNull();
    expect(toValidDate(new Date("nope"))).toBeNull();
  });
});

describe("UTC period boundaries (#1453)", () => {
  it("startOfUtcDay strips the time in UTC, not local time", () => {
    expect(startOfUtcDay("2026-08-12T23:59:59.999Z").toISOString()).toBe(
      "2026-08-12T00:00:00.000Z",
    );
    // 01:00 IST on the 12th is 19:30 UTC on the 11th — the UTC day is the 11th.
    expect(startOfUtcDay("2026-08-12T01:00:00+05:30").toISOString()).toBe(
      "2026-08-11T00:00:00.000Z",
    );
  });

  it("startOfUtcWeek returns the UTC Sunday that opens the week", () => {
    // Sun 9 Aug 2026 through Sat 15 Aug 2026 all open on Sun 9 Aug.
    for (const day of [9, 10, 11, 12, 13, 14, 15]) {
      const iso = `2026-08-${String(day).padStart(2, "0")}T12:00:00.000Z`;
      expect(startOfUtcWeek(iso).toISOString()).toBe(
        "2026-08-09T00:00:00.000Z",
      );
    }
  });

  it("starts a new week on the following Sunday", () => {
    expect(startOfUtcWeek("2026-08-16T00:00:00.000Z").toISOString()).toBe(
      "2026-08-16T00:00:00.000Z",
    );
  });

  it("uses Sunday as the week start, matching the code it replaces", () => {
    expect(WEEK_START_DAY).toBe(0);
    expect(startOfUtcWeek("2026-08-12T12:00:00.000Z").getUTCDay()).toBe(0);
  });

  it("startOfUtcMonth returns the first of the UTC month", () => {
    expect(startOfUtcMonth("2026-08-31T23:00:00.000Z").toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("crosses month and year boundaries correctly", () => {
    // Wed 1 Jan 2025 belongs to the week opening Sun 29 Dec 2024.
    expect(startOfUtcWeek("2025-01-01T00:00:00.000Z").toISOString()).toBe(
      "2024-12-29T00:00:00.000Z",
    );
  });

  it("returns null for an unusable date", () => {
    expect(startOfUtcDay("nope")).toBeNull();
    expect(startOfUtcWeek(null)).toBeNull();
    expect(startOfUtcMonth(undefined)).toBeNull();
  });

  it("startOfPeriod dispatches on granularity and rejects unknown ones", () => {
    const iso = "2026-08-12T10:00:00.000Z";
    expect(startOfPeriod(iso, "daily").toISOString()).toBe(
      "2026-08-12T00:00:00.000Z",
    );
    expect(startOfPeriod(iso, "weekly").toISOString()).toBe(
      "2026-08-09T00:00:00.000Z",
    );
    expect(startOfPeriod(iso, "monthly").toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
    expect(startOfPeriod(iso, "quarterly")).toBeNull();
  });
});

describe("periodKey (#1453)", () => {
  it("keeps the key formats the previous code produced", () => {
    const iso = "2026-08-12T10:00:00.000Z";
    expect(periodKey(iso, "daily")).toBe("2026-08-12");
    expect(periodKey(iso, "weekly")).toBe("2026-08-09");
    expect(periodKey(iso, "monthly")).toBe("2026-08");
  });

  it("zero-pads single-digit months and days", () => {
    expect(periodKey("2026-01-05T00:00:00.000Z", "daily")).toBe("2026-01-05");
    expect(periodKey("2026-01-05T00:00:00.000Z", "monthly")).toBe("2026-01");
  });

  it("defaults to the weekly granularity", () => {
    expect(DEFAULT_GRANULARITY).toBe("weekly");
    expect(periodKey("2026-08-12T10:00:00.000Z")).toBe("2026-08-09");
  });

  it("returns null for unusable input instead of a junk key", () => {
    expect(periodKey(null, "daily")).toBeNull();
    expect(periodKey("not a date", "weekly")).toBeNull();
    expect(periodKey("2026-08-12T10:00:00.000Z", "hourly")).toBeNull();
  });

  it("supports every advertised granularity", () => {
    for (const granularity of PERIOD_GRANULARITIES) {
      expect(periodKey("2026-08-12T10:00:00.000Z", granularity)).toBeTruthy();
    }
  });

  /**
   * Every assertion in here is about the *new* function's output only.
   *
   * It is tempting to also assert "and the old snippet got this wrong", but
   * that assertion would itself depend on the ambient `TZ` — under `TZ=UTC` the
   * old code was accidentally correct, which is exactly why the bug survived
   * four copies. So the tests pin the properties that must hold in every
   * timezone, and the suite is run under several in CI-equivalent checks.
   */
  describe("the regression: keys must be a pure function of the instant", () => {
    it("always returns a Sunday, which the old snippet did not", () => {
      // The clearest statement of the bug: with TZ=Asia/Kolkata the old code
      // turned 2026-08-09T02:00+05:30 into "2026-08-08" — a *Saturday*, and so
      // not a week boundary in the local calendar or in UTC. It is neither
      // right nor consistently wrong, which is why it produced a phantom
      // bucket rather than a uniformly shifted one.
      const instants = [
        "2026-08-09T02:00:00+05:30",
        "2026-08-09T10:00:00+05:30",
        "2026-08-12T10:00:00+05:30",
        "2026-08-15T23:30:00+05:30",
        "2026-01-01T00:30:00+05:30",
        "2025-12-28T23:45:00-08:00",
      ];

      for (const instant of instants) {
        const key = periodKey(instant, "weekly");
        expect(new Date(`${key}T00:00:00.000Z`).getUTCDay()).toBe(
          WEEK_START_DAY,
        );
      }
    });

    it("puts every instant in a UTC week under that week's Sunday", () => {
      // 2026-08-09T02:00+05:30 is 2026-08-08T20:30Z — a Saturday in UTC, so it
      // belongs to the week opening Sun 2 Aug. The old code answered
      // "2026-08-08" for it, which is no week's start.
      expect(periodKey("2026-08-09T02:00:00+05:30", "weekly")).toBe(
        "2026-08-02",
      );

      for (const instant of [
        "2026-08-09T10:00:00+05:30", // 2026-08-09T04:30Z, Sunday
        "2026-08-12T10:00:00+05:30", // 2026-08-12T04:30Z, Wednesday
        "2026-08-15T23:30:00+05:30", // 2026-08-15T18:00Z, Saturday
      ]) {
        expect(periodKey(instant, "weekly")).toBe("2026-08-09");
      }
    });

    it("is a pure function of the instant, however it is expressed", () => {
      // The old code read `getDay()` from the local calendar, so the same
      // instant could bucket differently depending on the server's TZ. Here
      // the same moment expressed four ways must give one answer.
      const answers = new Set(
        [
          "2026-08-12T04:30:00.000Z",
          "2026-08-12T10:00:00+05:30",
          "2026-08-11T21:30:00-07:00",
          new Date(Date.parse("2026-08-12T04:30:00.000Z")),
        ].map((value) => periodKey(value, "weekly")),
      );

      expect([...answers]).toEqual(["2026-08-09"]);
    });

    it("is not affected by the time of day within the period", () => {
      // The old snippet carried the record's clock time into `weekStart`, so
      // whether it crossed a UTC day boundary depended on the time of day.
      expect(periodKey("2026-08-09T00:00:00.000Z", "weekly")).toBe(
        periodKey("2026-08-15T23:59:59.999Z", "weekly"),
      );
    });

    it("agrees across granularities for the same instant", () => {
      // The old code read the daily key from UTC and the monthly key from the
      // local calendar, so on a non-UTC server they could disagree about which
      // month an instant was in.
      const iso = "2026-08-01T02:00:00+05:30"; // 2026-07-31T20:30Z
      expect(periodKey(iso, "daily")).toBe("2026-07-31");
      expect(periodKey(iso, "monthly")).toBe("2026-07");
      expect(periodKey(iso, "weekly")).toBe("2026-07-26");
    });
  });
});

describe("comparePeriodKeys (#1453)", () => {
  it("orders daily and weekly keys chronologically", () => {
    const sorted = ["2026-08-12", "2026-01-05", "2025-12-28"].sort(
      comparePeriodKeys,
    );
    expect(sorted).toEqual(["2025-12-28", "2026-01-05", "2026-08-12"]);
  });

  it("orders monthly keys chronologically", () => {
    const sorted = ["2026-10", "2026-02", "2025-11"].sort(comparePeriodKeys);
    expect(sorted).toEqual(["2025-11", "2026-02", "2026-10"]);
  });

  it("treats identical keys as equal", () => {
    expect(comparePeriodKeys("2026-08-09", "2026-08-09")).toBe(0);
  });
});

describe("groupByPeriod (#1453)", () => {
  const analytics = [
    { id: "c", analyzedAt: "2026-08-19T09:00:00.000Z" }, // week of 16 Aug
    { id: "a", analyzedAt: "2026-08-09T02:00:00.000Z" }, // week of 09 Aug
    { id: "b", analyzedAt: "2026-08-12T10:00:00.000Z" }, // week of 09 Aug
  ];

  const byAnalyzedAt = (item) => item.analyzedAt;

  it("groups records that share a period", () => {
    const { buckets } = groupByPeriod(analytics, {
      granularity: "weekly",
      getDate: byAnalyzedAt,
    });

    expect(buckets).toHaveLength(2);
    expect(buckets[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(buckets[1].items.map((i) => i.id)).toEqual(["c"]);
  });

  it("returns buckets in chronological order regardless of input order", () => {
    // audioAnalyticsService and followUpWorkflowService never sorted their
    // queries, so their trend arrays came back in arrival order.
    const { buckets } = groupByPeriod(analytics, {
      granularity: "weekly",
      getDate: byAnalyzedAt,
    });

    expect(buckets.map((b) => b.period)).toEqual(["2026-08-09", "2026-08-16"]);
  });

  it("skips records with an unusable date and counts them", () => {
    const { buckets, skipped } = groupByPeriod(
      [
        ...analytics,
        { id: "x", analyzedAt: null },
        { id: "y", analyzedAt: "garbage" },
      ],
      { granularity: "weekly", getDate: byAnalyzedAt },
    );

    expect(skipped).toBe(2);
    expect(buckets.flatMap((b) => b.items.map((i) => i.id))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("handles an empty or missing collection", () => {
    expect(groupByPeriod([], { getDate: byAnalyzedAt }).buckets).toEqual([]);
    expect(groupByPeriod(undefined, { getDate: byAnalyzedAt }).buckets).toEqual(
      [],
    );
  });

  it("preserves the input order of records inside a bucket", () => {
    const { buckets } = groupByPeriod(
      [
        { id: "second", analyzedAt: "2026-08-12T10:00:00.000Z" },
        { id: "first", analyzedAt: "2026-08-09T02:00:00.000Z" },
      ],
      { granularity: "weekly", getDate: byAnalyzedAt },
    );

    expect(buckets[0].items.map((i) => i.id)).toEqual(["second", "first"]);
  });

  it("groups daily and monthly the same way", () => {
    const daily = groupByPeriod(analytics, {
      granularity: "daily",
      getDate: byAnalyzedAt,
    });
    expect(daily.buckets.map((b) => b.period)).toEqual([
      "2026-08-09",
      "2026-08-12",
      "2026-08-19",
    ]);

    const monthly = groupByPeriod(analytics, {
      granularity: "monthly",
      getDate: byAnalyzedAt,
    });
    expect(monthly.buckets).toHaveLength(1);
    expect(monthly.buckets[0].period).toBe("2026-08");
  });

  it("skips everything when the granularity is unrecognised", () => {
    const { buckets, skipped } = groupByPeriod(analytics, {
      granularity: "fortnightly",
      getDate: byAnalyzedAt,
    });

    expect(buckets).toEqual([]);
    expect(skipped).toBe(3);
  });
});
