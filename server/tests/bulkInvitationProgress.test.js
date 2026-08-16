/**
 * Unit tests for bulk invitation progress tracking (Issue #1362).
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  startBulkInvitationJob,
  recordBulkInvitationResult,
  finishBulkInvitationJob,
  getBulkInvitationJob,
  clearBulkInvitationJobs,
} from "../services/bulkInvitationProgress.js";

describe("bulkInvitationProgress", () => {
  beforeEach(() => {
    clearBulkInvitationJobs();
  });

  it("tracks per-row progress up to 100%", () => {
    const job = startBulkInvitationJob(2);
    expect(job.progress).toBe(0);

    recordBulkInvitationResult(job.jobId, {
      row: 2,
      email: "a@example.com",
      success: true,
      invitationId: "1",
    });
    let current = getBulkInvitationJob(job.jobId);
    expect(current.processed).toBe(1);
    expect(current.successful).toBe(1);
    expect(current.progress).toBe(50);

    recordBulkInvitationResult(job.jobId, {
      row: 3,
      email: "bad",
      success: false,
      error: "Invalid email address.",
    });
    current = getBulkInvitationJob(job.jobId);
    expect(current.failed).toBe(1);
    expect(current.progress).toBe(100);

    finishBulkInvitationJob(job.jobId, "completed");
    expect(getBulkInvitationJob(job.jobId).status).toBe("completed");
  });
});
