/**
 * Period bucketing for trend endpoints (Issue #1453).
 *
 * ─── The bug ─────────────────────────────────────────────────────────────────
 *
 * Four trend endpoints carried the same copy-pasted snippet:
 *
 *     const weekStart = new Date(date);
 *     weekStart.setDate(weekStart.getDate() - weekStart.getDay());  // local
 *     const weekKey = weekStart.toISOString().split("T")[0];        // UTC
 *
 * `getDay()`, `getDate()` and `setDate()` read and write the **local** calendar.
 * `toISOString()` renders **UTC**. On any server not running in UTC the two
 * disagree, and the snippet never zeroes the time-of-day either — so
 * `weekStart` keeps the original record's clock time and whether it lands on
 * the previous UTC day depends on what time of day the record happened to be
 * created.
 *
 * With `TZ=Asia/Kolkata`, three timestamps in the same week (Sun 9 – Sat 15
 * August) produced two different keys:
 *
 *     2026-08-09T02:00+05:30  ->  2026-08-08     <- own bucket
 *     2026-08-09T10:00+05:30  ->  2026-08-09
 *     2026-08-12T10:00+05:30  ->  2026-08-09
 *
 * So a chart showed a phantom extra week with a partial count, and it only
 * reproduced on deployments whose `TZ` was not UTC — which is what made it look
 * flaky rather than wrong.
 *
 * The same mismatch applied to daily keys, and the monthly branch made it worse
 * by using `getFullYear()`/`getMonth()` (local) in the same function where the
 * daily branch used `toISOString()` (UTC). Three granularities, two calendars.
 *
 * ─── The rule ────────────────────────────────────────────────────────────────
 *
 * Everything here is computed in UTC, end to end, using the `getUTC*` family.
 * A period key is a pure function of the instant — the server's `TZ` cannot
 * change it, so a developer's laptop and the deployed container agree.
 *
 * Key formats are unchanged from the code this replaces, so no client or
 * response shape has to move:
 *
 *     daily    "YYYY-MM-DD"   the UTC day
 *     weekly   "YYYY-MM-DD"   the UTC Sunday that opens the week
 *     monthly  "YYYY-MM"      the UTC month
 *
 * Weeks start on Sunday because that is what `- getDay()` meant, and changing
 * it would silently redraw every existing chart.
 */

/** Granularities accepted by `periodKey` / `groupByPeriod`. */
export const PERIOD_GRANULARITIES = Object.freeze([
  "daily",
  "weekly",
  "monthly",
]);

/** Used when a caller passes nothing, matching the previous `period` defaults. */
export const DEFAULT_GRANULARITY = "weekly";

/**
 * Day index that opens a week, in `getUTCDay()` terms (0 = Sunday).
 *
 * Named rather than inlined because "why Sunday?" is a real question and the
 * answer — "because `- getDay()` already meant Sunday" — belongs next to it.
 */
export const WEEK_START_DAY = 0;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Zero-pads to two digits without pulling in a date library. */
const pad2 = (value) => String(value).padStart(2, "0");

/**
 * Coerces a value into a valid `Date`, or `null`.
 *
 * Trend inputs come from Mongo (`Date`), from JSON (`string`), and occasionally
 * from an epoch number, and any of them can be missing on a partially written
 * document. Returning `null` rather than an `Invalid Date` means a bad record
 * can be skipped instead of producing a literal `"NaN-aN-aN"` bucket, which is
 * what the previous code did.
 *
 * @param {Date|string|number|null|undefined} value
 * @returns {Date|null}
 */
export const toValidDate = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Midnight UTC on the day containing `value`.
 *
 * @param {Date|string|number} value
 * @returns {Date|null}
 */
export const startOfUtcDay = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

/**
 * Midnight UTC on the Sunday that opens the week containing `value`.
 *
 * Built by subtracting whole days from a already-normalized UTC midnight, so
 * there is no local-calendar step for a timezone offset to shift, and no
 * daylight-saving transition to make "seven days ago" mean 167 or 169 hours.
 *
 * @param {Date|string|number} value
 * @returns {Date|null}
 */
export const startOfUtcWeek = (value) => {
  const dayStart = startOfUtcDay(value);
  if (!dayStart) return null;

  const offset = (dayStart.getUTCDay() - WEEK_START_DAY + 7) % 7;
  return new Date(dayStart.getTime() - offset * MS_PER_DAY);
};

/**
 * Midnight UTC on the first day of the month containing `value`.
 *
 * @param {Date|string|number} value
 * @returns {Date|null}
 */
export const startOfUtcMonth = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

/**
 * The `Date` that opens the period containing `value`.
 *
 * Useful when a caller needs the boundary itself (a range query, an axis label)
 * rather than the string key.
 *
 * @param {Date|string|number} value
 * @param {"daily"|"weekly"|"monthly"} [granularity]
 * @returns {Date|null}
 */
export const startOfPeriod = (value, granularity = DEFAULT_GRANULARITY) => {
  switch (granularity) {
    case "daily":
      return startOfUtcDay(value);
    case "monthly":
      return startOfUtcMonth(value);
    case "weekly":
      return startOfUtcWeek(value);
    default:
      return null;
  }
};

/**
 * The bucket key for `value` at `granularity`.
 *
 * Returns `null` — never `"NaN-aN-aN"` or `undefined` — for an unusable date or
 * an unrecognised granularity, so callers can skip the record rather than
 * grouping several broken ones under a shared junk key.
 *
 * @param {Date|string|number} value
 * @param {"daily"|"weekly"|"monthly"} [granularity]
 * @returns {string|null}
 */
export const periodKey = (value, granularity = DEFAULT_GRANULARITY) => {
  const start = startOfPeriod(value, granularity);
  if (!start) return null;

  const year = start.getUTCFullYear();
  const month = pad2(start.getUTCMonth() + 1);

  if (granularity === "monthly") return `${year}-${month}`;
  return `${year}-${month}-${pad2(start.getUTCDate())}`;
};

/**
 * Comparator that orders period keys chronologically.
 *
 * Both formats this module emits are zero-padded and big-endian, so a plain
 * string comparison is already chronological — and unlike `new Date(key)` it
 * cannot be thrown off by a key the caller invented. Kept as a named function
 * because `.sort()` on strings without a comparator is a different operation in
 * enough languages that spelling out the intent is worth the line.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export const comparePeriodKeys = (a, b) => String(a).localeCompare(String(b));

/**
 * Groups `items` into period buckets, in chronological order.
 *
 * This is the whole of what the four call sites were hand-rolling: build a Map,
 * push into it, then hope the surrounding query happened to be sorted.
 * `audioAnalyticsService` and `followUpWorkflowService` did not sort, so their
 * trend arrays came back in whatever order the records arrived.
 *
 * Records whose date is missing or unparseable are skipped rather than dropped
 * into a shared bad bucket; `groupByPeriod` reports how many, so a caller can
 * log it if it ever matters.
 *
 * @template T
 * @param {T[]} items
 * @param {object} options
 * @param {(item: T) => Date|string|number} options.getDate
 * @param {"daily"|"weekly"|"monthly"} [options.granularity]
 * @returns {{buckets: Array<{period: string, items: T[]}>, skipped: number}}
 */
export const groupByPeriod = (
  items,
  { getDate, granularity = DEFAULT_GRANULARITY } = {},
) => {
  const map = new Map();
  let skipped = 0;

  for (const item of items || []) {
    const key = periodKey(getDate(item), granularity);

    if (!key) {
      skipped += 1;
      continue;
    }

    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  const buckets = [...map.entries()]
    .sort(([a], [b]) => comparePeriodKeys(a, b))
    .map(([period, bucketItems]) => ({ period, items: bucketItems }));

  return { buckets, skipped };
};

export default {
  PERIOD_GRANULARITIES,
  DEFAULT_GRANULARITY,
  WEEK_START_DAY,
  toValidDate,
  startOfUtcDay,
  startOfUtcWeek,
  startOfUtcMonth,
  startOfPeriod,
  periodKey,
  comparePeriodKeys,
  groupByPeriod,
};
