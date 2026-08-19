import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import cron from "node-cron";
import {
  startRecapBatchJob,
  stopRecapBatchJob,
  isRecapBatchJobInitialized,
} from "../recapBatchJob.js";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(() => ({
      stop: vi.fn(),
    })),
  },
}));

vi.mock("../../services/recapEmailService.js", () => ({
  default: {
    processScheduledBatch: vi.fn().mockResolvedValue({
      processed: 0,
      delivered: 0,
      skipped: 0,
      errors: 0,
      timing: "daily",
    }),
  },
}));

describe("Recap Batch Job Registration (#1398)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopRecapBatchJob();
  });

  afterEach(() => {
    stopRecapBatchJob();
  });

  it("registers daily and weekly cron jobs during startup", () => {
    startRecapBatchJob();

    expect(cron.schedule).toHaveBeenCalledTimes(2);
    expect(cron.schedule).toHaveBeenCalledWith(
      "0 0 * * *",
      expect.any(Function),
    );
    expect(cron.schedule).toHaveBeenCalledWith(
      "0 0 * * 0",
      expect.any(Function),
    );
    expect(isRecapBatchJobInitialized()).toBe(true);
  });

  it("registers the scheduler only once on repeated start calls", () => {
    startRecapBatchJob();
    startRecapBatchJob();
    startRecapBatchJob();

    expect(cron.schedule).toHaveBeenCalledTimes(2);
    expect(isRecapBatchJobInitialized()).toBe(true);
  });

  it("stops cleanly and allows a fresh registration afterward", () => {
    startRecapBatchJob();
    const dailyTask = cron.schedule.mock.results[0].value;
    const weeklyTask = cron.schedule.mock.results[1].value;

    stopRecapBatchJob();

    expect(dailyTask.stop).toHaveBeenCalledTimes(1);
    expect(weeklyTask.stop).toHaveBeenCalledTimes(1);
    expect(isRecapBatchJobInitialized()).toBe(false);

    startRecapBatchJob();
    expect(cron.schedule).toHaveBeenCalledTimes(4);
    expect(isRecapBatchJobInitialized()).toBe(true);
  });

  it("stop is a no-op when the job was never started", () => {
    expect(() => stopRecapBatchJob()).not.toThrow();
    expect(isRecapBatchJobInitialized()).toBe(false);
  });
});
