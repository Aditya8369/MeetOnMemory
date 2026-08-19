import { describe, it, expect, vi, beforeEach } from "vitest";
import cron from "node-cron";
import startFollowUpReminderJob from "../followUpReminderJob.js";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

describe("Follow-Up Reminder Job Registration (#1396)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules follow-up reminder and overdue task cron jobs", () => {
    startFollowUpReminderJob();

    expect(cron.schedule).toHaveBeenCalledWith(
      "*/15 * * * *",
      expect.any(Function),
    );
    expect(cron.schedule).toHaveBeenCalledWith(
      "0 * * * *",
      expect.any(Function),
    );
  });
});
