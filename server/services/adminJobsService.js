import {
  getQueueInstance,
  getQueueStatus,
  KNOWN_QUEUE_NAMES,
} from "./queueService.js";

const serializeFailedJob = (job) => ({
  id: String(job.id),
  name: job.name,
  queueName: job.queueName,
  failedReason: job.failedReason || null,
  attemptsMade: job.attemptsMade ?? 0,
  timestamp: job.timestamp || null,
  finishedOn: job.finishedOn || null,
  processedOn: job.processedOn || null,
  data:
    job.data && typeof job.data === "object" ? summarizeJobData(job.data) : {},
});

/**
 * Keep failed-job payloads small for the admin UI (avoid dumping transcripts).
 */
const summarizeJobData = (data) => {
  const summary = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) {
      summary[key] = value;
      continue;
    }
    if (typeof value === "string") {
      summary[key] = value.length > 120 ? `${value.slice(0, 117)}...` : value;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      summary[key] = value;
      continue;
    }
    if (typeof value === "object") {
      summary[key] = Array.isArray(value)
        ? `[array:${value.length}]`
        : "[object]";
    }
  }
  return summary;
};

/**
 * Builds the admin Jobs dashboard payload (Issue #2080).
 *
 * @param {{ failedLimit?: number }} [options]
 */
export const getAdminJobsDashboard = async ({ failedLimit = 20 } = {}) => {
  const limit = Math.min(50, Math.max(1, Number(failedLimit) || 20));
  const status = getQueueStatus();

  const queues = [];
  for (const name of KNOWN_QUEUE_NAMES) {
    const queue = getQueueInstance(name);
    if (!queue) {
      queues.push({
        name,
        available: false,
        counts: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        },
        recentFailed: [],
      });
      continue;
    }

    try {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );
      const failedJobs = await queue.getJobs(["failed"], 0, limit - 1);
      queues.push({
        name,
        available: true,
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
          paused: counts.paused || 0,
        },
        recentFailed: failedJobs.map(serializeFailedJob),
      });
    } catch (error) {
      queues.push({
        name,
        available: false,
        error: error?.message || "Failed to read queue",
        counts: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        },
        recentFailed: [],
      });
    }
  }

  return {
    redisConfigured: status.redisConfigured,
    workers: status.workers,
    shuttingDown: status.shuttingDown,
    queues,
  };
};

const assertKnownQueue = (queueName) => {
  if (!KNOWN_QUEUE_NAMES.includes(queueName)) {
    const err = new Error("Unknown queue");
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Retries a failed BullMQ job.
 */
export const retryFailedJob = async (queueName, jobId) => {
  assertKnownQueue(queueName);
  const queue = getQueueInstance(queueName);
  if (!queue) {
    const err = new Error("Queue unavailable (Redis not configured)");
    err.statusCode = 503;
    throw err;
  }

  const job = await queue.getJob(String(jobId));
  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  const state = await job.getState();
  if (state !== "failed") {
    const err = new Error(`Job is not failed (state: ${state})`);
    err.statusCode = 400;
    throw err;
  }

  await job.retry();
  return { queueName, jobId: String(job.id), state: "waiting" };
};

/**
 * Discards (removes) a failed BullMQ job.
 */
export const discardFailedJob = async (queueName, jobId) => {
  assertKnownQueue(queueName);
  const queue = getQueueInstance(queueName);
  if (!queue) {
    const err = new Error("Queue unavailable (Redis not configured)");
    err.statusCode = 503;
    throw err;
  }

  const job = await queue.getJob(String(jobId));
  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  const state = await job.getState();
  if (state !== "failed") {
    const err = new Error(
      `Only failed jobs can be discarded (state: ${state})`,
    );
    err.statusCode = 400;
    throw err;
  }

  await job.remove();
  return { queueName, jobId: String(jobId), discarded: true };
};
