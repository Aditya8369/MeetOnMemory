import { describe, it, expect } from "vitest";
import mongoose from "mongoose";

import {
  escapeRegExp,
  literalContainsFilter,
  normalizeSearchTerm,
  MAX_SEARCH_TERM_LENGTH,
} from "../utils/regexUtils.js";
import { buildArchiveMatch } from "../services/archivedKnowledgeService.js";

/**
 * Issue #1451 — `search` reached `$regex` unescaped in two places:
 *
 *   - knowledgeController.getDecisions  (`filter.text = { $regex: search }`)
 *   - archivedKnowledgeService.buildArchiveMatch
 *
 * Both are organization-scoped, so this was never cross-tenant exposure. What
 * it was: a search that silently did the wrong thing (`.*` as a wildcard), a
 * 500 on any pattern that does not compile (`[`), and an authenticated
 * ReDoS vector.
 *
 * These tests pin the two properties that matter — the pattern is literal, and
 * its length is bounded — at the helper and at the call site, so a future
 * refactor cannot quietly reintroduce raw interpolation.
 */

/** Applies a `{ $regex, $options }` fragment the way MongoDB would. */
const matches = (fragment, subject) =>
  new RegExp(fragment.$regex, fragment.$options).test(subject);

describe("normalizeSearchTerm (#1451)", () => {
  it("returns an empty string for values that are not usable text", () => {
    expect(normalizeSearchTerm(undefined)).toBe("");
    expect(normalizeSearchTerm(null)).toBe("");
    expect(normalizeSearchTerm("")).toBe("");
    expect(normalizeSearchTerm("   \t\n ")).toBe("");
    expect(normalizeSearchTerm(42)).toBe("");
    expect(normalizeSearchTerm({ $ne: null })).toBe("");
    expect(normalizeSearchTerm(["a", "b"])).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeSearchTerm("  quarterly review  ")).toBe(
      "quarterly review",
    );
  });

  it("truncates at the default ceiling", () => {
    const long = "a".repeat(MAX_SEARCH_TERM_LENGTH + 500);
    expect(normalizeSearchTerm(long)).toHaveLength(MAX_SEARCH_TERM_LENGTH);
  });

  it("honours an explicit maxLength", () => {
    expect(normalizeSearchTerm("abcdefghij", { maxLength: 4 })).toBe("abcd");
  });

  it("does not leave trailing whitespace when the cut lands mid-gap", () => {
    // 4-char limit on "abc defg" slices to "abc " — the trailing space would
    // otherwise become part of the pattern and match nothing.
    expect(normalizeSearchTerm("abc defg", { maxLength: 4 })).toBe("abc");
  });

  it("leaves a term at exactly the limit untouched", () => {
    const exact = "b".repeat(MAX_SEARCH_TERM_LENGTH);
    expect(normalizeSearchTerm(exact)).toBe(exact);
  });
});

describe("literalContainsFilter (#1451)", () => {
  it("returns null when there is nothing to search for", () => {
    expect(literalContainsFilter(undefined)).toBeNull();
    expect(literalContainsFilter("")).toBeNull();
    expect(literalContainsFilter("   ")).toBeNull();
    expect(literalContainsFilter(null)).toBeNull();
  });

  it("escapes every regex metacharacter", () => {
    const fragment = literalContainsFilter(".*+?^${}()|[]\\");
    expect(fragment.$regex).toBe(escapeRegExp(".*+?^${}()|[]\\"));
    expect(fragment.$options).toBe("i");
  });

  it("treats '.*' as literal text rather than a wildcard", () => {
    const fragment = literalContainsFilter(".*");

    // The regression: this used to match every decision in the organization.
    expect(matches(fragment, "Adopt the new billing provider")).toBe(false);
    expect(matches(fragment, "wildcard .* in the title")).toBe(true);
  });

  it("does not let '^' and '$' anchor the match", () => {
    const fragment = literalContainsFilter("^ship it$");
    expect(matches(fragment, "ship it")).toBe(false);
    expect(matches(fragment, "we said ^ship it$ in standup")).toBe(true);
  });

  it("compiles for a pattern that is not valid regex on its own", () => {
    // `new RegExp("[")` throws SyntaxError. Escaped, it is just a bracket.
    const fragment = literalContainsFilter("[");
    expect(() => new RegExp(fragment.$regex)).not.toThrow();
    expect(matches(fragment, "array[0] access")).toBe(true);
  });

  it("keeps literal searches working for text that looks like a pattern", () => {
    const fragment = literalContainsFilter("C++");
    expect(matches(fragment, "migrate the C++ parser")).toBe(true);
    expect(matches(fragment, "migrate the parser")).toBe(false);
  });

  it("is case-insensitive", () => {
    const fragment = literalContainsFilter("Billing");
    expect(matches(fragment, "BILLING provider")).toBe(true);
  });

  it("caps the pattern length so a huge term cannot be sent", () => {
    const fragment = literalContainsFilter("x".repeat(100_000));
    expect(fragment.$regex).toHaveLength(MAX_SEARCH_TERM_LENGTH);
  });

  it("neutralises a catastrophic-backtracking pattern", () => {
    // `(a+)+$` against a long non-matching subject is the classic ReDoS shape.
    // Escaped it is a literal string, so the match is linear.
    const fragment = literalContainsFilter("(a+)+$");
    const subject = `${"a".repeat(2000)}b`;

    const startedAt = Date.now();
    expect(matches(fragment, subject)).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });

  it("rejects a non-string so an object cannot reach the query", () => {
    // `?search[$ne]=` arrives as an object under Express' extended parser.
    expect(literalContainsFilter({ $ne: null })).toBeNull();
  });
});

describe("archivedKnowledgeService.buildArchiveMatch (#1451)", () => {
  const organization = new mongoose.Types.ObjectId();

  it("still scopes to the organization and the archived lifecycle state", () => {
    const match = buildArchiveMatch({ organization, search: "roadmap" });

    expect(String(match.organization)).toBe(String(organization));
    expect(match.lifecycleState).toBe("archived");
  });

  it("omits the text filter entirely when no search term is given", () => {
    expect(buildArchiveMatch({ organization })).not.toHaveProperty("text");
    expect(
      buildArchiveMatch({ organization, search: "  " }),
    ).not.toHaveProperty("text");
  });

  it("escapes the search term", () => {
    const match = buildArchiveMatch({ organization, search: ".*" });

    expect(match.text.$regex).toBe("\\.\\*");
    expect(matches(match.text, "any archived decision")).toBe(false);
  });

  it("caps the search term length", () => {
    const match = buildArchiveMatch({
      organization,
      search: "y".repeat(5000),
    });

    expect(match.text.$regex).toHaveLength(MAX_SEARCH_TERM_LENGTH);
  });

  it("does not put a raw RegExp object into the match", () => {
    const match = buildArchiveMatch({ organization, search: "budget" });

    // A string `$regex` is what keeps the pipeline serialisable and lets the
    // same fragment be reused across the union branches.
    expect(typeof match.text.$regex).toBe("string");
    expect(match.text.$options).toBe("i");
  });
});
