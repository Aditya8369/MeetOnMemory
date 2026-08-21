import { describe, it, expect } from "vitest";
import { isMeetingMuted } from "../services/notificationService.js";

describe("isMeetingMuted (#2064)", () => {
  it("returns true when meeting id is in mutedMeetingIds", () => {
    expect(
      isMeetingMuted(
        { mutedMeetingIds: ["507f1f77bcf86cd799439011"] },
        { meetingId: "507f1f77bcf86cd799439011" },
      ),
    ).toBe(true);
  });

  it("returns false when meeting is not muted or metadata missing", () => {
    expect(
      isMeetingMuted(
        { mutedMeetingIds: ["507f1f77bcf86cd799439011"] },
        { meetingId: "507f1f77bcf86cd799439012" },
      ),
    ).toBe(false);
    expect(isMeetingMuted({ mutedMeetingIds: [] }, { meetingId: "x" })).toBe(
      false,
    );
    expect(isMeetingMuted(undefined, { meetingId: "x" })).toBe(false);
    expect(
      isMeetingMuted({ mutedMeetingIds: ["507f1f77bcf86cd799439011"] }, {}),
    ).toBe(false);
  });
});
