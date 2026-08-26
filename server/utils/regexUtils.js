/**
 * Regex helpers (Issue #1157 / #1770).
 *
 * Seven call sites built a `RegExp` by interpolating user-controlled text
 * without escaping it. The helper to prevent that already existed — it just
 * lived in `utils/meetingSoftDelete.js`, which is not somewhere you look when
 * you are writing a tag uniqueness check.
 *
 * Literal escaping lives in `utils/regex.js` (`escapeRegex`). This module
 * re-exports it as `escapeRegExp` so existing importers are unaffected, and
 * adds the higher-level helpers (equality, word-boundary, `$regex` fragments).
 *
 * Two rules for anything that reaches for this module:
 *
 *   1. Interpolating a value into a `RegExp` without `escapeRegExp` is a bug.
 *      Not a style preference — the value decides whether the expression
 *      compiles at all (`"C++"` throws `SyntaxError: Nothing to repeat`) and
 *      what it matches if it does (`".*"` matches everything).
 *
 *   2. If what you actually want is case-insensitive *equality*, do not use a
 *      regex at all. Use `caseInsensitiveEquals` below, which produces a plain
 *      equality query plus a collation. It is index-friendly, it cannot be
 *      given a pathological pattern, and it says what it means.
 */

import { escapeRegex } from "./regex.js";

/**
 * Escapes every character that carries meaning inside a regular expression, so
 * the result matches `value` literally.
 *
 * Alias of `escapeRegex` (Issue #1770) — one implementation, two names.
 *
 * @param {string} value
 * @returns {string}
 */
export const escapeRegExp = escapeRegex;
export { escapeRegex };

/**
 * Builds an anchored, case-insensitive regex that matches `value` literally.
 *
 * Prefer `caseInsensitiveEquals` for database queries — this is for the cases
 * where a `RegExp` object is genuinely required (string replacement, for
 * instance), not for `{ $regex: ... }` filters.
 *
 * @param {string} value
 * @param {string} [flags="i"]
 * @returns {RegExp}
 */
export const literalRegExp = (value, flags = "i") =>
  new RegExp(`^${escapeRegExp(value)}$`, flags);

/**
 * MongoDB collation for case- and diacritic-insensitive comparison.
 *
 * `strength: 2` compares base letters and accents but ignores case, which is
 * what "does a tag with this name already exist?" means in practice.
 */
export const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 };

/**
 * Expresses "this field equals `value`, ignoring case" as a query fragment
 * plus the collation it needs.
 *
 * Used as:
 *
 *   const { filter, collation } = caseInsensitiveEquals("name", name);
 *   await Tag.findOne({ organization, ...filter }).collation(collation);
 *
 * A regex cannot do this safely: `^value$` with the `i` flag is only equality
 * if `value` contains no metacharacters, which is precisely the assumption
 * that failed.
 *
 * @param {string} field
 * @param {string} value
 * @returns {{filter: object, collation: object}}
 */
export const caseInsensitiveEquals = (field, value) => ({
  filter: { [field]: String(value ?? "") },
  collation: CASE_INSENSITIVE_COLLATION,
});

/**
 * Builds a word-boundary replacement pattern for `value`.
 *
 * `\b` is a *boundary between* a word and a non-word character, so it does not
 * match where there is no word character to bound. `new RegExp("\\b#1\\b")`
 * matches nothing at all, because neither `#` nor the position before it is
 * preceded by a word character.
 *
 * Speaker labels are free text (`"#1"`, `"(host)"`, `"— unknown —"`), so the
 * boundary is applied only on the sides where it can actually mean something.
 * A label that starts or ends with a non-word character gets a lookaround that
 * asserts "not adjacent to a word character" instead, which is the same intent
 * expressed in a way that can match.
 *
 * @param {string} value
 * @param {string} [flags="g"]
 * @returns {RegExp}
 */
export const wordBoundaryRegExp = (value, flags = "g") => {
  const raw = String(value ?? "");
  const escaped = escapeRegExp(raw);

  const startsWithWordChar = /^\w/.test(raw);
  const endsWithWordChar = /\w$/.test(raw);

  const prefix = startsWithWordChar ? "\\b" : "(?<!\\w)";
  const suffix = endsWithWordChar ? "\\b" : "(?!\\w)";

  return new RegExp(`${prefix}${escaped}${suffix}`, flags);
};

/**
 * Upper bound on how long a free-text search term may be before it is cut
 * short (Issue #1451).
 *
 * Escaping removes the *metacharacter* half of the problem — `.*` stops being
 * a wildcard — but it does not remove the cost half. `$regex` is not
 * index-assisted for an unanchored pattern, so every candidate document is
 * scanned character by character and the work is proportional to
 * `documents x pattern length`. A 100 KB `?search=` value is a cheap request
 * to send and an expensive one to serve, and `getDecisions` evaluates its
 * filter twice per request — once for `countDocuments`, once for the page.
 *
 * 200 characters is comfortably longer than anything a person types into a
 * search box and short enough that the per-document cost stays flat.
 */
export const MAX_SEARCH_TERM_LENGTH = 200;

/**
 * Trims a caller-supplied search term and truncates it to `maxLength`.
 *
 * Returns `""` for anything that is not usable text (absent, non-string,
 * whitespace-only) so callers can branch on one falsy check instead of
 * repeating `typeof value === "string" && value.trim()` at every site.
 *
 * Over-long input is **truncated, not rejected**, matching how
 * `utils/pagination.js` clamps out-of-range limits: someone who pastes an
 * essay into the search box gets results for the first 200 characters rather
 * than a 400 they cannot act on.
 *
 * @param {unknown} value
 * @param {object} [options]
 * @param {number} [options.maxLength=MAX_SEARCH_TERM_LENGTH]
 * @returns {string}
 */
export const normalizeSearchTerm = (
  value,
  { maxLength = MAX_SEARCH_TERM_LENGTH } = {},
) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const limit = Math.max(1, maxLength);
  if (trimmed.length <= limit) return trimmed;

  // Trim again after slicing so a cut that lands mid-whitespace does not leave
  // a trailing space inside the pattern.
  return trimmed.slice(0, limit).trim();
};

/**
 * Builds a `$regex` fragment matching documents that *contain* `value` as
 * literal text, case-insensitively.
 *
 * This is the safe form of the idiom that was scattered across the search
 * endpoints:
 *
 *   filter.text = { $regex: search, $options: "i" };  // wildcard + ReDoS
 *   filter.text = literalContainsFilter(search);      // literal, bounded
 *
 * Returns `null` when there is nothing to search for, so the call shape is
 * always `const f = literalContainsFilter(q); if (f) filter.text = f;`. An
 * empty term can therefore never widen the query to "everything" by accident.
 *
 * @param {unknown} value
 * @param {object} [options]
 * @param {number} [options.maxLength=MAX_SEARCH_TERM_LENGTH]
 * @returns {{$regex: string, $options: string}|null}
 */
export const literalContainsFilter = (
  value,
  { maxLength = MAX_SEARCH_TERM_LENGTH } = {},
) => {
  const term = normalizeSearchTerm(value, { maxLength });
  if (!term) return null;

  return { $regex: escapeRegExp(term), $options: "i" };
};

export default {
  escapeRegex,
  escapeRegExp,
  literalRegExp,
  caseInsensitiveEquals,
  wordBoundaryRegExp,
  normalizeSearchTerm,
  literalContainsFilter,
  CASE_INSENSITIVE_COLLATION,
  MAX_SEARCH_TERM_LENGTH,
};
