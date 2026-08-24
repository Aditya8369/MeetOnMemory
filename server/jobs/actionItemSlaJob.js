import cron from "node-cron";
import actionItemSlaService from "../services/actionItemSlaService.js";

let isInitialized = false;
/** @type {import("node-cron").ScheduledTask | null} */
let slaJobTask = null;

export const startActionItemSlaJob = () => {
  if (isInitialized) {
    console.warn("⚠️ Action Item SLA job already initialized");
    return;
  }

  // Run hourly (at minute 0)
  slaJobTask = cron.schedule("0 * * * *", async () => {
    try {
      console.log("⏰ Running scheduled Action Item SLA detection job...");
      const summary = await actionItemSlaService.detectAllBreaches();
      if (summary.totalBreaches > 0) {
        console.log(
          `✅ Action Item SLA detection complete: ${summary.totalBreaches} new breaches found.`,
        );
      }
    } catch (error) {
      console.error("❌ Error in scheduled Action Item SLA job:", error);
    }
  });

  isInitialized = true;
  console.log("✅ Action Item SLA job scheduled (0 * * * *)");
};

export const stopActionItemSlaJob = () => {
  if (slaJobTask) {
    slaJobTask.stop();
    slaJobTask = null;
  }

  if (isInitialized) {
    isInitialized = false;
    console.log("Action Item SLA job stopped");
  }
};

export const isActionItemSlaJobInitialized = () => isInitialized;

export default startActionItemSlaJob;
