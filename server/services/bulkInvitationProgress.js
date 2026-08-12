/**
 * In-memory progress tracking for bulk invitation imports (Issue #1362).
 *
 * Synchronous imports complete in a single request and return `progress: 100`
 * in the response. This registry still records job state so a future async /
 * BullMQ worker can report progress without changing the response shape.
 *
 * Entries expire after TTL to avoid unbounded growth.
 */

import crypto from "crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hour
/** @type {Map<string, object>} */
const jobs = new Map();

const pruneExpired = () => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > TTL_MS) {
      jobs.delete(id);
    }
  }
};

/**
 * @param {number} totalRows
 * @returns {{ jobId: string, status: string, totalRows: number, processed: number, successful: number, failed: number, progress: number, results: Array }}
 */
export const startBulkInvitationJob = (totalRows) => {
  pruneExpired();
  const jobId = crypto.randomUUID();
  const now = Date.now();
  const job = {
    jobId,
    status: "processing",
    totalRows,
    processed: 0,
    successful: 0,
    failed: 0,
    progress: totalRows === 0 ? 100 : 0,
    results: [],
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(jobId, job);
  return job;
};

/**
 * @param {string} jobId
 * @param {Partial<object>} patch
 * @returns {object|null}
 */
export const updateBulkInvitationJob = (jobId, patch) => {
  const job = jobs.get(jobId);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: Date.now() });
  if (job.totalRows > 0) {
    job.progress = Math.min(
      100,
      Math.round((job.processed / job.totalRows) * 100),
    );
  } else {
    job.progress = 100;
  }
  return job;
};

/**
 * Record one finished row and recompute progress.
 * @param {string} jobId
 * @param {object} result
 * @returns {object|null}
 */
export const recordBulkInvitationResult = (jobId, result) => {
  const job = jobs.get(jobId);
  if (!job) return null;
  job.results.push(result);
  job.processed += 1;
  if (result.success) job.successful += 1;
  else job.failed += 1;
  return updateBulkInvitationJob(jobId, {});
};

/**
 * @param {string} jobId
 * @returns {object|null}
 */
export const getBulkInvitationJob = (jobId) => {
  pruneExpired();
  return jobs.get(jobId) || null;
};

/**
 * @param {string} jobId
 * @param {"completed"|"failed"} status
 */
export const finishBulkInvitationJob = (jobId, status = "completed") => {
  return updateBulkInvitationJob(jobId, {
    status,
    progress: 100,
  });
};

/** Test helper — clears all tracked jobs. */
export const clearBulkInvitationJobs = () => {
  jobs.clear();
};

export default {
  startBulkInvitationJob,
  updateBulkInvitationJob,
  recordBulkInvitationResult,
  getBulkInvitationJob,
  finishBulkInvitationJob,
  clearBulkInvitationJobs,
};
