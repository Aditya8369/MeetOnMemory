import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/queueService.js", () => ({
  KNOWN_QUEUE_NAMES: ["test-queue", "other-queue"],
  getQueueStatus: vi.fn(() => ({
    redisConfigured: true,
    workers: ["test-queue"],
    shuttingDown: false,
  })),
  getQueueInstance: vi.fn(),
}));

import { getQueueInstance } from "../services/queueService.js";
import {
  getAdminJobsDashboard,
  retryFailedJob,
  discardFailedJob,
} from "../services/adminJobsService.js";

describe("adminJobsService (Issue #2080)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns queue depths and recent failed jobs", async () => {
    const failedJob = {
      id: "42",
      name: "export",
      queueName: "test-queue",
      failedReason: "boom",
      attemptsMade: 3,
      timestamp: 1,
      finishedOn: 2,
      processedOn: 1,
      data: { meetingId: "m1", transcript: "x".repeat(200) },
    };

    getQueueInstance.mockImplementation((name) => {
      if (name !== "test-queue") return null;
      return {
        getJobCounts: vi.fn().mockResolvedValue({
          waiting: 1,
          active: 0,
          completed: 5,
          failed: 1,
          delayed: 0,
          paused: 0,
        }),
        getJobs: vi.fn().mockResolvedValue([failedJob]),
      };
    });

    const dashboard = await getAdminJobsDashboard({ failedLimit: 10 });
    expect(dashboard.redisConfigured).toBe(true);
    expect(dashboard.queues).toHaveLength(2);

    const testQueue = dashboard.queues.find((q) => q.name === "test-queue");
    expect(testQueue.available).toBe(true);
    expect(testQueue.counts.waiting).toBe(1);
    expect(testQueue.counts.failed).toBe(1);
    expect(testQueue.recentFailed).toHaveLength(1);
    expect(testQueue.recentFailed[0].failedReason).toBe("boom");
    expect(testQueue.recentFailed[0].data.transcript.endsWith("...")).toBe(
      true,
    );
  });

  it("retries a failed job", async () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    getQueueInstance.mockReturnValue({
      getJob: vi.fn().mockResolvedValue({
        id: "9",
        getState: vi.fn().mockResolvedValue("failed"),
        retry,
      }),
    });

    const result = await retryFailedJob("test-queue", "9");
    expect(retry).toHaveBeenCalled();
    expect(result).toEqual({
      queueName: "test-queue",
      jobId: "9",
      state: "waiting",
    });
  });

  it("rejects retry for unknown queue", async () => {
    await expect(retryFailedJob("nope", "1")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("discards a failed job", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    getQueueInstance.mockReturnValue({
      getJob: vi.fn().mockResolvedValue({
        id: "9",
        getState: vi.fn().mockResolvedValue("failed"),
        remove,
      }),
    });

    const result = await discardFailedJob("test-queue", "9");
    expect(remove).toHaveBeenCalled();
    expect(result.discarded).toBe(true);
  });

  it("rejects discard when job is not failed", async () => {
    getQueueInstance.mockReturnValue({
      getJob: vi.fn().mockResolvedValue({
        id: "9",
        getState: vi.fn().mockResolvedValue("active"),
        remove: vi.fn(),
      }),
    });

    await expect(discardFailedJob("test-queue", "9")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
