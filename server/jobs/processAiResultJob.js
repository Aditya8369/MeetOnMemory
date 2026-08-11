import eventBus from "../services/eventBus.js";
import Meeting from "../models/meetingModel.js";
import {
  processStructuredMoM,
  detectResolutions,
} from "../services/knowledgeGraphService.js";
import User from "../models/userModel.js";

import { indexMeeting } from "../utils/embeddingUtils.js";
import {
  normalizeMoM,
  buildHumanReadableMoM,
} from "../services/GenerativeAIService.js";
import MeetingDigestService from "../services/MeetingDigestService.js";

export default async function processAiResultJob(job, _app) {
  const {
    meetingId,
    transcript,
    date,
    title,
    userId,
    structuredMoM: structured,
    generation,
  } = job.data;

  try {
    const textToSummarize = (transcript || "").trim();

    console.log(
      `🧠 Processing AI Result for ${meetingId || "transcript-only"}...`,
    );

    if (generation?.degraded) {
      console.warn(
        `⚠️ MoM for ${meetingId || "transcript-only"} was generated in degraded mode ` +
          `(${generation.provider}, reason: ${generation.reason}). Consider reprocessing.`,
      );
    }

    if (!structured) {
      throw new Error("No structured summary generated");
    }

    const mom = normalizeMoM(structured, title, date, generation);
    const humanReadable = buildHumanReadableMoM(mom);

    let meetingToUpdate = null;

    if (meetingId) {
      meetingToUpdate = await Meeting.findById(meetingId);
      if (!meetingToUpdate) {
        throw new Error(
          `Meeting ${meetingId} no longer exists; cannot persist generated MoM`,
        );
      }
      meetingToUpdate.title = mom.title;
      meetingToUpdate.date = new Date(date);
      meetingToUpdate.summary = humanReadable;
      meetingToUpdate.structuredMoM = mom;
      meetingToUpdate.status = "completed";
      await meetingToUpdate.save();
    } else {
      const user = await User.findById(userId);
      const userOrg = user?.organization || null;

      meetingToUpdate = await Meeting.create({
        uploadedBy: userId,
        organization: userOrg,
        title: mom.title,
        date: new Date(date),
        transcript: textToSummarize,
        summary: humanReadable,
        structuredMoM: mom,
        status: "completed",
      });
      await indexMeeting(meetingToUpdate);
    }

    console.log("✅ MoM saved to database");

    // Trigger internal events for webhooks
    try {
      if (!meetingId) {
        eventBus.emit("meeting.created", {
          meeting: meetingToUpdate,
          membersToNotify: [],
        });
      }
      eventBus.emit("mom.generated", meetingToUpdate);
    } catch (evtErr) {
      console.error(
        "⚠️ Failed to emit webhook events from queue:",
        evtErr.message,
      );
    }

    try {
      await detectResolutions(meetingToUpdate, mom);
      await processStructuredMoM(meetingToUpdate, mom);
    } catch (kgError) {
      console.error(
        "⚠️ Knowledge graph processing failed (non-fatal):",
        kgError,
      );
    }

    // Fire and forget email digest
    MeetingDigestService.sendMeetingDigest(meetingToUpdate._id).catch(
      (err) => {
        console.error("Failed to send meeting digest automatically:", err);
      },
    );

    return { success: true, meetingId: meetingToUpdate._id };
  } catch (error) {
    if (meetingId) {
      try {
        const meeting = await Meeting.findById(meetingId);
        if (meeting) {
          meeting.status = "failed";
          await meeting.save();
          eventBus.emit("meeting.updated", meeting);
        }
      } catch (dbErr) {
        console.error("⚠️ Failed to update meeting status to failed:", dbErr);
      }
    }
    throw error;
  }
}
