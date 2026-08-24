import { describe, expect, it } from "vitest";
import {
  buildScheduleSlot,
  findBusyParticipants,
  findFocusConflicts,
} from "../scheduleConflicts";

describe("schedule conflict helpers", () => {
  it("builds a local schedule slot from date, time and duration", () => {
    const slot = buildScheduleSlot("2026-08-24", "10:30", 45);

    expect(slot.start.getHours()).toBe(10);
    expect(slot.start.getMinutes()).toBe(30);
    expect(slot.end.getTime() - slot.start.getTime()).toBe(45 * 60 * 1000);
  });

  it("detects a recurring focus block on the selected weekday", () => {
    const slot = buildScheduleSlot("2026-08-24", "10:30", 30);
    const conflicts = findFocusConflicts(
      [
        {
          _id: "focus-1",
          title: "Deep work",
          isRecurring: true,
          daysOfWeek: [1],
          startTime: "2026-08-01T10:00:00.000Z",
          endTime: "2026-08-01T11:00:00.000Z",
        },
      ],
      slot,
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].title).toBe("Deep work");
  });

  it("lists only participants whose busy interval overlaps the proposed slot", () => {
    const slot = buildScheduleSlot("2026-08-24", "10:30", 30);
    const participants = [
      { name: "Busy User", email: "busy@example.com" },
      { name: "Free User", email: "free@example.com" },
    ];

    const busy = findBusyParticipants(
      {
        google: {
          "busy@example.com": {
            busy: [
              {
                start: "2026-08-24T10:15:00.000Z",
                end: "2026-08-24T11:00:00.000Z",
              },
            ],
          },
          "free@example.com": {
            busy: [
              {
                start: "2026-08-24T12:00:00.000Z",
                end: "2026-08-24T13:00:00.000Z",
              },
            ],
          },
        },
      },
      participants,
      slot,
    );

    expect(busy).toHaveLength(1);
    expect(busy[0].email).toBe("busy@example.com");
  });
});
