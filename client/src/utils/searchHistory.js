const STORAGE_KEY = "meetonmemory.searchHistory.v1";
const MAX_ENTRIES = 10;

export function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function saveSearchHistoryEntry(entry) {
  const query = String(entry?.query || "").trim();
  if (!query) return loadSearchHistory();

  const nextEntry = {
    query,
    mode: entry.mode === "hybrid" ? "hybrid" : "standard",
    filters: entry.filters || {},
    weights: entry.weights || null,
    at: new Date().toISOString(),
  };

  const prev = loadSearchHistory().filter(
    (item) =>
      !(
        item.query === nextEntry.query &&
        item.mode === nextEntry.mode &&
        JSON.stringify(item.filters || {}) ===
          JSON.stringify(nextEntry.filters || {})
      ),
  );

  const next = [nextEntry, ...prev].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function searchStateToParams({ query, mode, filters, weights }) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  if (mode === "hybrid") params.set("mode", "hybrid");
  if (filters?.dateFrom) params.set("from", filters.dateFrom);
  if (filters?.dateTo) params.set("to", filters.dateTo);
  if (filters?.meetingType) params.set("meetingType", filters.meetingType);
  if (filters?.speaker) params.set("speaker", filters.speaker);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.resultType && filters.resultType !== "all") {
    params.set("resultType", filters.resultType);
  }
  if (filters?.sortBy && filters.sortBy !== "relevance") {
    params.set("sort", filters.sortBy);
  }
  if (mode === "hybrid" && typeof weights?.semanticWeight === "number") {
    params.set("sw", String(Math.round(weights.semanticWeight * 100)));
  }
  return params;
}

export function paramsToSearchState(params) {
  const q = params.get("q") || "";
  const mode = params.get("mode") === "hybrid" ? "hybrid" : "standard";
  const sw = Number.parseInt(params.get("sw") || "", 10);
  const semanticWeight =
    Number.isFinite(sw) && sw >= 0 && sw <= 100 ? sw / 100 : 0.7;

  return {
    query: q,
    mode,
    filters: {
      resultType: params.get("resultType") || "all",
      dateFrom: params.get("from") || "",
      dateTo: params.get("to") || "",
      sortBy: params.get("sort") || "relevance",
      meetingType: params.get("meetingType") || "",
      speaker: params.get("speaker") || "",
      tag: params.get("tag") || "",
    },
    weights: {
      semanticWeight,
      graphWeight: 1 - semanticWeight,
    },
  };
}
