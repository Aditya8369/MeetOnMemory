import { describe, it, expect } from "vitest";
import {
  applyHybridAdvancedFilters,
  parseHybridFilterOptions,
} from "../utils/hybridAdvancedFilters.js";

describe("hybridAdvancedFilters (Issue #2085)", () => {
  it("parses advanced filter fields", () => {
    const opts = parseHybridFilterOptions({
      dateFrom: "2026-01-01",
      dateTo: "2026-02-01",
      meetingType: "internal",
      speaker: " Ada ",
      tag: "finance",
    });
    expect(opts.dateFrom).toBe("2026-01-01");
    expect(opts.meetingType).toBe("internal");
    expect(opts.speaker).toBe("Ada");
    expect(opts.tag).toBe("finance");
  });

  it("filters by tag and speaker", () => {
    const sample = [
      {
        type: "meeting",
        title: "A",
        date: "2026-01-10T12:00:00.000Z",
        meetingType: "internal",
        tags: ["finance"],
        participants: [{ name: "Ada Lovelace", email: "ada@ex.com" }],
      },
      {
        type: "decision",
        title: "B",
        sourceMeeting: {
          date: "2026-03-01T12:00:00.000Z",
          meetingType: "conference",
          tags: ["ops"],
          participants: [{ name: "Bob" }],
        },
      },
    ];

    const byTag = applyHybridAdvancedFilters(sample, { tag: "finance" });
    expect(byTag).toHaveLength(1);
    expect(byTag[0].title).toBe("A");

    const bySpeaker = applyHybridAdvancedFilters(sample, { speaker: "ada" });
    expect(bySpeaker).toHaveLength(1);
    expect(bySpeaker[0].title).toBe("A");
  });

  it("filters by date range and meeting type", () => {
    const sample = [
      {
        type: "meeting",
        title: "A",
        date: "2026-01-10T12:00:00.000Z",
        meetingType: "internal",
        tags: [],
        participants: [],
      },
      {
        type: "decision",
        title: "B",
        sourceMeeting: {
          date: "2026-03-01T12:00:00.000Z",
          meetingType: "conference",
          tags: [],
          participants: [],
        },
      },
    ];

    const ranged = applyHybridAdvancedFilters(sample, {
      dateFrom: "2026-02-01",
      dateTo: "2026-03-31",
      meetingType: "conference",
    });
    expect(ranged).toHaveLength(1);
    expect(ranged[0].title).toBe("B");
  });
});
