import cron from "node-cron";
import meetingPatternService from "./meetingPatternService.js";

const startMeetingPatternJob = () => {
  // Run every Sunday at 00:00 UTC
  cron.schedule(
    "0 0 * * 0",
    async () => {
      console.log("Starting weekly meeting pattern detection job...");
      try {
        await meetingPatternService.runDetectionJob();
        console.log("Weekly meeting pattern detection job completed.");
      } catch (error) {
        console.error("Error running meeting pattern detection job:", error);
      }
    },
    {
      timezone: "UTC",
    },
  );
};

export default startMeetingPatternJob;
