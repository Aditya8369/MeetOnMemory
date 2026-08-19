import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import cron from "node-cron";
import {
  startActionItemReminderJob,
  stopActionItemReminderJob,
  isActionItemReminderJobInitialized,
} from "../actionItemReminderJob.js";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(() => ({
      stop: vi.fn(),
    })),
  },
}));

vi.mock("../../services/actionItemReminderService.js", () => ({
  processActionItemReminders: vi.fn().mockResolvedValue({
    upcomingCount: 0,
    overdueCount: 0,
    processedCount: 0,
    errorCount: 0,
  }),
}));

describe("Action Item Reminder Job Registration (#1397)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopActionItemReminderJob();
  });

  afterEach(() => {
    stopActionItemReminderJob();
  });

  it("registers the reminder cron during startup", () => {
    startActionItemReminderJob();

    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(cron.schedule).toHaveBeenCalledWith(
      "*/15 * * * *",
      expect.any(Function),
    );
    expect(isActionItemReminderJobInitialized()).toBe(true);
  });

  it("registers the scheduler only once on repeated start calls", () => {
    startActionItemReminderJob();
    startActionItemReminderJob();
    startActionItemReminderJob();

    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(isActionItemReminderJobInitialized()).toBe(true);
  });

  it("stops cleanly and allows a fresh registration afterward", () => {
    startActionItemReminderJob();
    const task = cron.schedule.mock.results[0].value;

    stopActionItemReminderJob();

    expect(task.stop).toHaveBeenCalledTimes(1);
    expect(isActionItemReminderJobInitialized()).toBe(false);

    startActionItemReminderJob();
    expect(cron.schedule).toHaveBeenCalledTimes(2);
    expect(isActionItemReminderJobInitialized()).toBe(true);
  });

  it("stop is a no-op when the job was never started", () => {
    expect(() => stopActionItemReminderJob()).not.toThrow();
    expect(isActionItemReminderJobInitialized()).toBe(false);
  });
});
