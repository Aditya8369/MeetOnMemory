import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearSearchHistory,
  loadSearchHistory,
  paramsToSearchState,
  saveSearchHistoryEntry,
  searchStateToParams,
} from "../searchHistory.js";

describe("searchHistory utils (Issue #2085)", () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
  });

  it("saves and dedupes recent searches", () => {
    saveSearchHistoryEntry({
      query: "alpha",
      mode: "hybrid",
      filters: { tag: "x" },
    });
    saveSearchHistoryEntry({
      query: "beta",
      mode: "standard",
      filters: {},
    });
    saveSearchHistoryEntry({
      query: "alpha",
      mode: "hybrid",
      filters: { tag: "x" },
    });

    const history = loadSearchHistory();
    expect(history).toHaveLength(2);
    expect(history[0].query).toBe("alpha");
    expect(history[1].query).toBe("beta");
  });

  it("round-trips query state through URL params", () => {
    const params = searchStateToParams({
      query: "roadmap",
      mode: "hybrid",
      filters: {
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        meetingType: "internal",
        speaker: "Ada",
        tag: "ops",
      },
      weights: { semanticWeight: 0.6, graphWeight: 0.4 },
    });

    const state = paramsToSearchState(params);
    expect(state.query).toBe("roadmap");
    expect(state.mode).toBe("hybrid");
    expect(state.filters.meetingType).toBe("internal");
    expect(state.filters.speaker).toBe("Ada");
    expect(state.filters.tag).toBe("ops");
    expect(state.weights.semanticWeight).toBeCloseTo(0.6);
  });

  it("clears history", () => {
    saveSearchHistoryEntry({ query: "keep" });
    expect(loadSearchHistory()).toHaveLength(1);
    clearSearchHistory();
    expect(loadSearchHistory()).toHaveLength(0);
  });
});
