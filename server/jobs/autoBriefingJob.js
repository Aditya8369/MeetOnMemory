import cron from "node-cron";
import Meeting from "../models/meetingModel.js";
import { generatePreMeetingBriefing } from "../services/preMeetingBriefingService.js";

/** @type {import("node-cron").ScheduledTask | null} */
let autoBriefingTask = null;

export const initAutoBriefingJob = () => {
  // Run every hour at the top of the hour
  autoBriefingTask = cron.schedule("0 * * * *", async () => {
    try {
      console.log("[AutoBriefing] Starting auto-generation job...");

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find meetings in the next 24 hours that don't have a briefing yet.
      // We look for meetings with a specific date set.
      const upcomingMeetings = await Meeting.aggregate([
        {
          $match: {
            date: { $gte: now, $lte: tomorrow },
            status: { $ne: "deleted" }, // Ignore soft-deleted or similar
          },
        },
        {
          $lookup: {
            from: "meetingbriefings", // Mongoose pluralizes to this by default
            localField: "_id",
            foreignField: "meetingId",
            as: "briefing",
          },
        },
        {
          $match: {
            briefing: { $size: 0 }, // Only meetings without a briefing
          },
        },
      ]);

      console.log(
        `[AutoBriefing] Found ${upcomingMeetings.length} meetings requiring briefings.`,
      );

      for (const meeting of upcomingMeetings) {
        try {
          await generatePreMeetingBriefing(meeting);
          console.log(
            `[AutoBriefing] Successfully generated briefing for meeting ${meeting._id}`,
          );
        } catch (error) {
          console.error(
            `[AutoBriefing] Failed to generate briefing for meeting ${meeting._id}:`,
            error.message,
          );
        }
      }
    } catch (err) {
      console.error("[AutoBriefing] Job failed:", err);
    }
  });

  console.log("Auto-briefing cron job registered");
};

export const stopAutoBriefingJob = () => {
  if (autoBriefingTask) {
    autoBriefingTask.stop();
    autoBriefingTask = null;
  }
};
