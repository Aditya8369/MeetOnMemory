/**
 * Advanced hybrid-search filters (Issue #2085).
 * Pure helpers — no Redis/Pinecone/Mongo required.
 */

const MEETING_TYPES = Object.freeze([
  "conference",
  "policy",
  "event",
  "internal",
]);

export function parseHybridFilterOptions(sanitized = {}) {
  const meetingType =
    typeof sanitized.meetingType === "string" &&
    MEETING_TYPES.includes(sanitized.meetingType)
      ? sanitized.meetingType
      : "";

  const dateFrom =
    typeof sanitized.dateFrom === "string" && sanitized.dateFrom
      ? sanitized.dateFrom.slice(0, 10)
      : "";
  const dateTo =
    typeof sanitized.dateTo === "string" && sanitized.dateTo
      ? sanitized.dateTo.slice(0, 10)
      : "";
  const speaker =
    typeof sanitized.speaker === "string" ? sanitized.speaker.trim() : "";
  const tag = typeof sanitized.tag === "string" ? sanitized.tag.trim() : "";

  return { dateFrom, dateTo, meetingType, speaker, tag };
}

/**
 * Applies advanced meeting filters to hybrid results.
 * Uses meeting / sourceMeeting metadata attached during enrichment.
 */
export function applyHybridAdvancedFilters(results, options = {}) {
  if (!Array.isArray(results) || !results.length) return results || [];

  const dateFrom = options.dateFrom
    ? new Date(`${options.dateFrom}T00:00:00.000Z`)
    : null;
  const dateTo = options.dateTo
    ? new Date(`${options.dateTo}T23:59:59.999Z`)
    : null;
  const meetingType = options.meetingType || "";
  const speaker = (options.speaker || "").toLowerCase();
  const tag = (options.tag || "").toLowerCase();

  if (!dateFrom && !dateTo && !meetingType && !speaker && !tag) {
    return results;
  }

  return results.filter((result) => {
    const meetingMeta =
      result.type === "meeting" ? result : result.sourceMeeting || {};

    const rawDate =
      meetingMeta.date || meetingMeta.createdAt || result.createdAt || null;
    if (dateFrom || dateTo) {
      if (!rawDate) return false;
      const when = new Date(rawDate);
      if (Number.isNaN(when.getTime())) return false;
      if (dateFrom && when < dateFrom) return false;
      if (dateTo && when > dateTo) return false;
    }

    if (meetingType) {
      const type = meetingMeta.meetingType || result.meetingType || "";
      if (type !== meetingType) return false;
    }

    if (speaker) {
      const participants =
        meetingMeta.participants || result.participants || [];
      const hit = participants.some((p) => {
        const name = String(p?.name || "").toLowerCase();
        const email = String(p?.email || "").toLowerCase();
        return name.includes(speaker) || email.includes(speaker);
      });
      if (!hit) return false;
    }

    if (tag) {
      const tags = meetingMeta.tags || result.tags || [];
      const hit = tags.some((t) => String(t).toLowerCase() === tag);
      if (!hit) return false;
    }

    return true;
  });
}
