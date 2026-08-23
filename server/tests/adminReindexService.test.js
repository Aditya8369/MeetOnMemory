import { describe, it, expect, vi, beforeEach } from "vitest";

const { findOne, updateOne, updateMany, countDocuments, find, add } =
  vi.hoisted(() => ({
    findOne: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
    add: vi.fn(),
  }));

vi.mock("../models/meetingModel.js", () => ({
  default: {
    findOne,
    updateOne,
    updateMany,
    countDocuments,
    find,
  },
}));

vi.mock("../services/queueService.js", () => ({
  embeddingReindexQueue: {
    get isActive() {
      return true;
    },
    add,
  },
  getQueueInstance: vi.fn(),
}));

import {
  enqueueMeetingReindex,
  enqueueOrgReindex,
  listOrgEmbeddingStatus,
} from "../services/adminReindexService.js";

describe("adminReindexService (Issue #2084)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a meeting reindex and marks status queued", async () => {
    findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "m1", title: "Standup" }),
    });
    add.mockResolvedValue({ id: "reindex-meeting-m1" });
    updateOne.mockResolvedValue({});

    const result = await enqueueMeetingReindex({
      organizationId: "org1",
      meetingId: "m1",
    });

    expect(add).toHaveBeenCalledWith(
      "reindex-meeting",
      { organizationId: "org1", meetingId: "m1" },
      expect.objectContaining({ jobId: "reindex-meeting-m1" }),
    );
    expect(result.status).toBe("queued");
    expect(updateOne).toHaveBeenCalled();
  });

  it("rejects meeting reindex without org", async () => {
    await expect(
      enqueueMeetingReindex({ meetingId: "m1" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("enqueues org reindex when meetings exist", async () => {
    countDocuments.mockResolvedValue(3);
    add.mockResolvedValue({ id: "reindex-org-org1" });
    updateMany.mockResolvedValue({});

    const result = await enqueueOrgReindex({ organizationId: "org1" });
    expect(result.meetingCount).toBe(3);
    expect(result.jobName).toBe("reindex-org");
    expect(updateMany).toHaveBeenCalled();
  });

  it("lists embedding status without leaking transcripts", async () => {
    find.mockReturnValue({
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [
              {
                _id: "m1",
                title: "A",
                date: new Date("2026-01-01"),
                transcript: "secret transcript text",
                embeddingIndex: {
                  status: "succeeded",
                  lastIndexedAt: new Date("2026-01-02"),
                  lastError: null,
                  lastJobId: "j1",
                },
              },
            ],
          }),
        }),
      }),
    });

    const payload = await listOrgEmbeddingStatus({ organizationId: "org1" });
    expect(payload.meetings).toHaveLength(1);
    expect(payload.meetings[0].hasTranscript).toBe(true);
    expect(payload.meetings[0].transcript).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("secret transcript");
  });
});
