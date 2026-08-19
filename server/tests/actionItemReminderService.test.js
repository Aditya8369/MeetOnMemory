import { jest } from "@jest/globals";
import mongoose from "mongoose";

jest.unstable_mockModule("../models/actionItemModel.js", () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../services/notificationService.js", () => ({
  createNotification: jest.fn().mockResolvedValue({ id: "notif_1" }),
}));

const ActionItem = (await import("../models/actionItemModel.js")).default;
const userModel = (await import("../models/userModel.js")).default;
const { createNotification } =
  await import("../services/notificationService.js");
const { processActionItemReminders } =
  await import("../services/actionItemReminderService.js");

const mockFindReturning = (items) => {
  const mockPopulate = jest.fn().mockResolvedValue(items);
  jest.spyOn(ActionItem, "find").mockReturnValue({ populate: mockPopulate });
  return mockPopulate;
};

describe("actionItemReminderService (#1397)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
      collation: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    });
  });

  it("should send upcoming reminders for action items due within 24h", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() + 12 * 60 * 60 * 1000);

    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId }),
    });

    const mockItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Submit financial report",
      owner: userId.toString(),
      status: "open",
      dueDate,
      remindersEnabled: true,
      reminderSent: { upcoming: false, overdue: false },
      organization: orgId,
      sourceMeetingId: { _id: "m1", title: "Q3 Planning", organizer: userId },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([mockItem]);

    const result = await processActionItemReminders({
      organization: orgId.toString(),
    });

    expect(ActionItem.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $in: ["open", "in-progress"] },
        remindersEnabled: { $ne: false },
        lifecycleState: { $nin: ["archived", "expired"] },
        supersededByMemory: null,
        organization: orgId.toString(),
      }),
    );
    expect(result.upcomingCount).toBe(1);
    expect(result.overdueCount).toBe(0);
    expect(createNotification).toHaveBeenCalledWith(
      userId.toString(),
      expect.stringContaining("Due Soon"),
      expect.stringContaining("Submit financial report"),
      // Issue #977: action-item reminders moved from "meetings" to their own
      // "tasks" category, so the pushTaskAssignments preference actually
      // governs them instead of pushMeetingReminders silently killing them.
      "tasks",
      "/tasks",
      "View Action Items",
      expect.any(Object),
    );
    expect(mockItem.reminderSent.upcoming).toBe(true);
    expect(mockItem.save).toHaveBeenCalled();
  });

  it("should send overdue reminders for past action items", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() - 2 * 60 * 60 * 1000);

    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId }),
    });

    const mockItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Fix login bug",
      owner: userId.toString(),
      status: "in-progress",
      dueDate,
      remindersEnabled: true,
      reminderSent: { upcoming: true, overdue: false },
      organization: orgId,
      sourceMeetingId: {
        _id: "m2",
        title: "Engineering Sync",
        organizer: userId,
      },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([mockItem]);

    const result = await processActionItemReminders({
      organization: orgId.toString(),
    });

    expect(result.upcomingCount).toBe(0);
    expect(result.overdueCount).toBe(1);
    expect(createNotification).toHaveBeenCalledWith(
      userId.toString(),
      expect.stringContaining("Overdue"),
      expect.stringContaining("Fix login bug"),
      "tasks",
      "/tasks",
      "View Action Items",
      expect.any(Object),
    );
    expect(mockItem.reminderSent.overdue).toBe(true);
    expect(mockItem.save).toHaveBeenCalled();
  });

  it("should not resend duplicate reminders if already sent", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() - 2 * 60 * 60 * 1000);

    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId }),
    });

    const mockItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Update documentation",
      owner: userId.toString(),
      status: "open",
      dueDate,
      remindersEnabled: true,
      reminderSent: { upcoming: true, overdue: true },
      organization: orgId,
      sourceMeetingId: { _id: "m3", title: "Docs Review", organizer: userId },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([mockItem]);

    const result = await processActionItemReminders({
      organization: orgId.toString(),
    });

    expect(result.upcomingCount).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
    expect(mockItem.save).not.toHaveBeenCalled();
  });

  it("notifies the resolved owner and scopes ObjectId lookup to the organization", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() + 6 * 60 * 60 * 1000);

    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId }),
    });

    const mockItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Prep slides",
      owner: userId.toString(),
      status: "open",
      dueDate,
      remindersEnabled: true,
      reminderSent: { upcoming: false, overdue: false },
      organization: orgId,
      sourceMeetingId: {
        title: "Kickoff",
        organizer: new mongoose.Types.ObjectId(),
      },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([mockItem]);

    await processActionItemReminders({ organization: orgId.toString() });

    expect(userModel.findOne).toHaveBeenCalledWith({
      _id: userId.toString(),
      organization: orgId,
    });
    expect(createNotification).toHaveBeenCalledWith(
      userId.toString(),
      expect.any(String),
      expect.any(String),
      "tasks",
      "/tasks",
      "View Action Items",
      expect.objectContaining({ reminderType: "upcoming" }),
    );
  });

  it("falls back to meeting organizer when owner is outside the organization", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const foreignOwner = new mongoose.Types.ObjectId();
    const organizerId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() + 6 * 60 * 60 * 1000);

    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const mockItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Cross-org leak attempt",
      owner: foreignOwner.toString(),
      status: "open",
      dueDate,
      remindersEnabled: true,
      reminderSent: { upcoming: false, overdue: false },
      organization: orgId,
      sourceMeetingId: { title: "Sync", organizer: organizerId },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([mockItem]);

    await processActionItemReminders({ organization: orgId.toString() });

    expect(createNotification).toHaveBeenCalledWith(
      organizerId.toString(),
      expect.any(String),
      expect.any(String),
      "tasks",
      "/tasks",
      "View Action Items",
      expect.any(Object),
    );
  });

  it("continues processing after a notification failure", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const dueSoon = new Date(Date.now() + 4 * 60 * 60 * 1000);

    userModel.findOne
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ _id: userA }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ _id: userB }),
      });

    createNotification
      .mockRejectedValueOnce(new Error("delivery failed"))
      .mockResolvedValueOnce({ id: "notif_2" });

    const failingItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Fails first",
      owner: userA.toString(),
      status: "open",
      dueDate: dueSoon,
      remindersEnabled: true,
      reminderSent: { upcoming: false, overdue: false },
      organization: orgId,
      sourceMeetingId: { title: "A", organizer: userA },
      save: jest.fn().mockResolvedValue(true),
    };

    const succeedingItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Succeeds second",
      owner: userB.toString(),
      status: "open",
      dueDate: dueSoon,
      remindersEnabled: true,
      reminderSent: { upcoming: false, overdue: false },
      organization: orgId,
      sourceMeetingId: { title: "B", organizer: userB },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([failingItem, succeedingItem]);

    const result = await processActionItemReminders({
      organization: orgId.toString(),
    });

    expect(result.errorCount).toBe(1);
    expect(result.upcomingCount).toBe(1);
    expect(failingItem.save).not.toHaveBeenCalled();
    expect(succeedingItem.reminderSent.upcoming).toBe(true);
    expect(succeedingItem.save).toHaveBeenCalled();
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  it("does not mark reminderSent when notification fails", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() - 60 * 60 * 1000);

    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId }),
    });
    createNotification.mockRejectedValue(new Error("boom"));

    const mockItem = {
      _id: new mongoose.Types.ObjectId(),
      text: "Should retry later",
      owner: userId.toString(),
      status: "open",
      dueDate,
      remindersEnabled: true,
      reminderSent: { upcoming: false, overdue: false },
      organization: orgId,
      sourceMeetingId: { title: "Retry", organizer: userId },
      save: jest.fn().mockResolvedValue(true),
    };

    mockFindReturning([mockItem]);

    const result = await processActionItemReminders({
      organization: orgId.toString(),
    });

    expect(result.errorCount).toBe(1);
    expect(result.overdueCount).toBe(0);
    expect(mockItem.reminderSent.overdue).toBe(false);
    expect(mockItem.save).not.toHaveBeenCalled();
  });
});
