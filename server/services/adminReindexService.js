import Meeting from "../models/meetingModel.js";
import { embeddingReindexQueue, getQueueInstance } from "./queueService.js";

const QUEUE_NAME = "embedding-reindex-queue";
const ORG_REINDEX_CAP = 500;

const assertOrg = (organizationId) => {
  if (!organizationId) {
    const err = new Error("Organization is required");
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Enqueue a single-meeting Pinecone reindex (Issue #2084).
 */
export const enqueueMeetingReindex = async ({
  organizationId,
  meetingId,
} = {}) => {
  assertOrg(organizationId);
  if (!meetingId) {
    const err = new Error("meetingId is required");
    err.statusCode = 400;
    throw err;
  }

  const meeting = await Meeting.findOne({
    _id: meetingId,
    organization: organizationId,
    deletedAt: null,
  }).select("_id title embeddingIndex");

  if (!meeting) {
    const err = new Error("Meeting not found in this organization");
    err.statusCode = 404;
    throw err;
  }

  if (!embeddingReindexQueue.isActive) {
    const err = new Error("Reindex queue unavailable (Redis not configured)");
    err.statusCode = 503;
    throw err;
  }

  let job;
  try {
    job = await embeddingReindexQueue.add(
      "reindex-meeting",
      {
        organizationId: String(organizationId),
        meetingId: String(meetingId),
      },
      {
        jobId: `reindex-meeting-${meetingId}`,
        removeOnComplete: { count: 50, age: 24 * 60 * 60 },
      },
    );
  } catch (err) {
    const conflict = new Error(
      err?.message?.includes("Job")
        ? "A reindex job for this meeting is already queued or active"
        : err?.message || "Failed to enqueue reindex job",
    );
    conflict.statusCode = 409;
    throw conflict;
  }

  if (!job) {
    const err = new Error("Failed to enqueue reindex job");
    err.statusCode = 503;
    throw err;
  }

  await Meeting.updateOne(
    { _id: meeting._id },
    {
      $set: {
        "embeddingIndex.status": "queued",
        "embeddingIndex.lastError": null,
        "embeddingIndex.lastJobId": String(job.id),
      },
    },
  );

  return {
    queue: QUEUE_NAME,
    jobId: String(job.id),
    jobName: "reindex-meeting",
    meetingId: String(meeting._id),
    status: "queued",
  };
};

/**
 * Enqueue org-wide reindex (rate-limited to one active job per org).
 */
export const enqueueOrgReindex = async ({ organizationId } = {}) => {
  assertOrg(organizationId);

  if (!embeddingReindexQueue.isActive) {
    const err = new Error("Reindex queue unavailable (Redis not configured)");
    err.statusCode = 503;
    throw err;
  }

  const countable = await Meeting.countDocuments({
    organization: organizationId,
    deletedAt: null,
    transcript: { $exists: true, $ne: "" },
  });

  if (countable === 0) {
    const err = new Error("No indexable meetings found for this organization");
    err.statusCode = 400;
    throw err;
  }

  if (countable > ORG_REINDEX_CAP) {
    const err = new Error(
      `Org reindex capped at ${ORG_REINDEX_CAP} meetings (found ${countable})`,
    );
    err.statusCode = 400;
    throw err;
  }

  let job;
  try {
    job = await embeddingReindexQueue.add(
      "reindex-org",
      { organizationId: String(organizationId) },
      {
        jobId: `reindex-org-${organizationId}`,
        removeOnComplete: { count: 20, age: 24 * 60 * 60 },
      },
    );
  } catch (err) {
    const conflict = new Error(
      err?.message?.includes("Job")
        ? "An org reindex job is already queued or active"
        : err?.message || "Failed to enqueue org reindex job",
    );
    conflict.statusCode = 409;
    throw conflict;
  }

  if (!job) {
    const err = new Error("Failed to enqueue org reindex job");
    err.statusCode = 503;
    throw err;
  }

  await Meeting.updateMany(
    {
      organization: organizationId,
      deletedAt: null,
      transcript: { $exists: true, $ne: "" },
    },
    {
      $set: {
        "embeddingIndex.status": "queued",
        "embeddingIndex.lastJobId": String(job.id),
        "embeddingIndex.lastError": null,
      },
    },
  );

  return {
    queue: QUEUE_NAME,
    jobId: String(job.id),
    jobName: "reindex-org",
    meetingCount: countable,
    status: "queued",
  };
};

/**
 * Job progress for the Jobs dashboard / admin UI.
 */
export const getReindexJobStatus = async (jobId) => {
  if (!jobId) {
    const err = new Error("jobId is required");
    err.statusCode = 400;
    throw err;
  }

  const queue = getQueueInstance(QUEUE_NAME);
  if (!queue) {
    const err = new Error("Reindex queue unavailable (Redis not configured)");
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
  return {
    queue: QUEUE_NAME,
    jobId: String(job.id),
    name: job.name,
    state,
    progress: job.progress || null,
    failedReason: job.failedReason || null,
    finishedOn: job.finishedOn || null,
    processedOn: job.processedOn || null,
    data: {
      organizationId: job.data?.organizationId || null,
      meetingId: job.data?.meetingId || null,
    },
  };
};

/**
 * Meetings with embedding index metadata for the admin view.
 */
export const listOrgEmbeddingStatus = async ({
  organizationId,
  limit = 25,
} = {}) => {
  assertOrg(organizationId);
  const capped = Math.min(50, Math.max(1, Number(limit) || 25));

  const meetings = await Meeting.find({
    organization: organizationId,
    deletedAt: null,
  })
    .select("title date embeddingIndex transcript")
    .sort({ updatedAt: -1 })
    .limit(capped)
    .lean();

  return {
    queue: QUEUE_NAME,
    meetings: meetings.map((m) => ({
      id: String(m._id),
      title: m.title,
      date: m.date,
      hasTranscript: Boolean(m.transcript && String(m.transcript).trim()),
      embeddingIndex: m.embeddingIndex || {
        status: "idle",
        lastIndexedAt: null,
        lastError: null,
        lastJobId: null,
      },
    })),
  };
};
