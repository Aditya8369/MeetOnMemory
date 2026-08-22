import { describe, it, expect } from "vitest";
import { groupNotifications, notificationId } from "../groupNotifications.js";

describe("groupNotifications (#2064)", () => {
  const sample = [
    {
      id: "1",
      category: "meetings",
      createdAt: "2026-08-20T10:00:00Z",
      metadata: { meetingId: "m1", meetingTitle: "Sprint Planning" },
      isRead: false,
    },
    {
      id: "2",
      category: "tasks",
      createdAt: "2026-08-20T12:00:00Z",
      metadata: { meetingId: "m1", meetingTitle: "Sprint Planning" },
      isRead: true,
    },
    {
      id: "3",
      category: "meetings",
      createdAt: "2026-08-21T09:00:00Z",
      metadata: { meetingId: "m2" },
      isRead: false,
    },
  ];

  it("groups by day", () => {
    const groups = groupNotifications(sample, "day");
    expect(groups.length).toBe(2);
    expect(groups.every((g) => g.key.startsWith("day:"))).toBe(true);
  });

  it("groups by meeting", () => {
    const groups = groupNotifications(sample, "meeting");
    expect(groups).toHaveLength(2);
    const sprint = groups.find((g) => g.key === "meeting:m1");
    expect(sprint.label).toBe("Sprint Planning");
    expect(sprint.items).toHaveLength(2);
  });

  it("groups by type", () => {
    const groups = groupNotifications(sample, "type");
    expect(groups.map((g) => g.key).sort()).toEqual([
      "type:meetings",
      "type:tasks",
    ]);
  });

  it("supports flat none grouping", () => {
    const groups = groupNotifications(sample, "none");
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(3);
  });

  it("resolves notification ids from id or _id", () => {
    expect(notificationId({ id: "abc" })).toBe("abc");
    expect(notificationId({ _id: "xyz" })).toBe("xyz");
  });
});
