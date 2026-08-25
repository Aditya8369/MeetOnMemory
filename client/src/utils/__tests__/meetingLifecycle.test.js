import { describe, expect, it } from "vitest";
import { isMeetingEnded } from "../meetingLifecycle";

describe("isMeetingEnded (#1986)", () => {
  it("treats status completed as ended", () => {
    expect(isMeetingEnded({ status: "completed" })).toBe(true);
  });

  it("treats a scheduled window that has passed as ended", () => {
    expect(
      isMeetingEnded(
        {
          status: "uploaded",
          date: "2026-01-01T10:00:00.000Z",
          duration: 60,
        },
        Date.parse("2026-01-01T11:01:00.000Z"),
      ),
    ).toBe(true);
  });

  it("does not treat an upcoming or in-progress meeting as ended", () => {
    expect(
      isMeetingEnded(
        {
          status: "uploaded",
          date: "2026-01-01T10:00:00.000Z",
          duration: 60,
        },
        Date.parse("2026-01-01T10:30:00.000Z"),
      ),
    ).toBe(false);
    expect(isMeetingEnded({ status: "processing" })).toBe(false);
    expect(isMeetingEnded({ status: "uploaded" })).toBe(false);
  });
});
