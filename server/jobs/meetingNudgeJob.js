import cron from "node-cron";
import { evaluateUpcomingMeetings } from "../services/meetingNudgeService.js";

let nudgeJob = null;

export const startMeetingNudgeJob = () => {
  // Run every hour
  nudgeJob = cron.schedule("0 * * * *", async () => {
    try {
      console.log("Running meetingNudgeJob...");
      await evaluateUpcomingMeetings(24);
    } catch (error) {
      console.error("Error in meetingNudgeJob:", error);
    }
  });
  console.log("Meeting Nudge Job started (Hourly)");
};

export const stopMeetingNudgeJob = () => {
  if (nudgeJob) {
    nudgeJob.stop();
    console.log("Meeting Nudge Job stopped");
  }
};
