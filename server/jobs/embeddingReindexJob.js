import Meeting from "../models/meetingModel.js";
import {
  deleteMeetingFromPinecone,
  indexMeeting,
} from "../utils/embeddingUtils.js";

/**
 * BullMQ job processor for Pinecone reindex (Issue #2084).
 * Job names: reindex-meeting | reindex-org
 */
export default async function embeddingReindexJob(job) {
  const { organizationId, meetingId } = job.data || {};

  if (job.name === "reindex-meeting") {
    if (!meetingId) throw new Error("meetingId is required");
    return reindexOneMeeting(meetingId, organizationId, job);
  }

  if (job.name === "reindex-org") {
    if (!organizationId) throw new Error("organizationId is required");
    return reindexOrgMeetings(organizationId, job);
  }

  throw new Error(`Unsupported embedding reindex job: ${job.name}`);
}

async function reindexOneMeeting(meetingId, organizationId, job) {
  const filter = { _id: meetingId, deletedAt: null };
  if (organizationId) filter.organization = organizationId;

  const meeting = await Meeting.findOne(filter);
  if (!meeting) throw new Error("Meeting not found");
  if (!meeting.transcript) {
    await Meeting.updateOne(
      { _id: meeting._id },
      {
        $set: {
          "embeddingIndex.status": "failed",
          "embeddingIndex.lastError": "Meeting has no transcript to index",
          "embeddingIndex.lastJobId": String(job.id),
        },
      },
    );
    return { skipped: true, reason: "no_transcript" };
  }

  await Meeting.updateOne(
    { _id: meeting._id },
    {
      $set: {
        "embeddingIndex.status": "running",
        "embeddingIndex.lastError": null,
        "embeddingIndex.lastJobId": String(job.id),
      },
    },
  );

  await deleteMeetingFromPinecone(meeting._id);
  await indexMeeting(meeting);

  return { meetingId: String(meeting._id), indexed: true };
}

async function reindexOrgMeetings(organizationId, job) {
  const meetings = await Meeting.find({
    organization: organizationId,
    deletedAt: null,
    transcript: { $exists: true, $ne: "" },
  }).select("_id title transcript summary organization");

  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < meetings.length; i += 1) {
    const meeting = meetings[i];
    try {
      await Meeting.updateOne(
        { _id: meeting._id },
        {
          $set: {
            "embeddingIndex.status": "running",
            "embeddingIndex.lastJobId": String(job.id),
            "embeddingIndex.lastError": null,
          },
        },
      );
      await deleteMeetingFromPinecone(meeting._id);
      await indexMeeting(meeting);
      indexed += 1;
    } catch (err) {
      failed += 1;
      await Meeting.updateOne(
        { _id: meeting._id },
        {
          $set: {
            "embeddingIndex.status": "failed",
            "embeddingIndex.lastError": String(err?.message || err).slice(
              0,
              500,
            ),
            "embeddingIndex.lastJobId": String(job.id),
          },
        },
      );
    }

    await job.updateProgress({
      total: meetings.length,
      completed: i + 1,
      indexed,
      failed,
    });
  }

  return {
    organizationId: String(organizationId),
    total: meetings.length,
    indexed,
    failed,
  };
}
