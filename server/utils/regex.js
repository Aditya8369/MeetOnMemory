/**
 * Escape user-controlled strings before they are interpolated into MongoDB
 * `$regex` patterns or `RegExp` constructors (Issue #1770).
 *
 * Without this, inputs such as `.*`, `^admin$`, `foo|bar`, and `(a+)+b` are
 * compiled as live patterns: they match unintended documents, can bypass
 * prefix/equality intent, and can cause ReDoS.
 *
 * This is the single implementation. Other modules re-export it — do not
 * copy the character class elsewhere.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
