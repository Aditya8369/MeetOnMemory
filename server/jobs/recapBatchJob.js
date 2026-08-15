import cron from "node-cron";
import RecapEmailService from "../services/recapEmailService.js";

/**
 * Recap Batch Cron Job (Issue #1398)
 *
 * Registers daily + weekly sweeps that call the existing RecapEmailService.
 * Must start exactly once at backend startup and stop cleanly on shutdown.
 */

let isInitialized = false;
/** @type {import("node-cron").ScheduledTask | null} */
let dailyTask = null;
/** @type {import("node-cron").ScheduledTask | null} */
let weeklyTask = null;

const runBatch = async (timing) => {
  console.log(`[RecapBatchJob] Running ${timing} recap email batch...`);
  try {
    const summary = await RecapEmailService.processScheduledBatch(timing);
    console.log(
      `[RecapBatchJob] ${timing} batch complete — processed=${summary.processed}, delivered=${summary.delivered}, skipped=${summary.skipped}, errors=${summary.errors}`,
    );
  } catch (err) {
    // Keep the scheduler healthy — one failed sweep must not crash the process.
    console.error(`[RecapBatchJob] Error in ${timing} job:`, err);
  }
};

/**
 * Start daily (00:00) and weekly (Sunday 00:00) recap batch cron jobs.
 * Idempotent — repeated calls do not register additional schedules.
 */
export const startRecapBatchJob = () => {
  if (isInitialized) {
    console.warn("⚠️ Recap batch job already initialized");
    return;
  }

  // Daily job - runs at 00:00 every day
  dailyTask = cron.schedule("0 0 * * *", async () => {
    await runBatch("daily");
  });

  // Weekly job - runs at 00:00 on Sunday (0)
  weeklyTask = cron.schedule("0 0 * * 0", async () => {
    await runBatch("weekly");
  });

  isInitialized = true;
  console.log("✅ RecapBatchJob scheduled (daily 0 0 * * *, weekly 0 0 * * 0)");
};

/**
 * Stop both recap batch cron tasks and clear registration state.
 * Safe to call when the job was never started.
 */
export const stopRecapBatchJob = () => {
  if (dailyTask) {
    dailyTask.stop();
    dailyTask = null;
  }
  if (weeklyTask) {
    weeklyTask.stop();
    weeklyTask = null;
  }

  if (isInitialized) {
    isInitialized = false;
    console.log("RecapBatchJob stopped");
  }
};

export const isRecapBatchJobInitialized = () => isInitialized;

export default startRecapBatchJob;
