import cron from "node-cron";
import { processActionItemReminders } from "../services/actionItemReminderService.js";

/**
 * Action Item Reminder Job (Issue #1397)
 *
 * Schedules periodic sweeps that call the existing
 * `processActionItemReminders` service. Registration must happen exactly once
 * at backend startup and stop cleanly on shutdown.
 */

let isInitialized = false;
/** @type {import("node-cron").ScheduledTask | null} */
let reminderTask = null;

/**
 * Start the action-item reminder cron job (every 15 minutes).
 * Idempotent — repeated calls do not register additional schedules.
 */
export const startActionItemReminderJob = () => {
  if (isInitialized) {
    console.warn("⚠️ Action Item reminder job already initialized");
    return;
  }

  reminderTask = cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("⏰ Running scheduled Action Item reminder job...");
      const summary = await processActionItemReminders();
      if (summary.upcomingCount > 0 || summary.overdueCount > 0) {
        console.log(
          `✅ Action Item reminders sent: ${summary.upcomingCount} upcoming, ${summary.overdueCount} overdue.`,
        );
      }
    } catch (error) {
      // Keep the scheduler healthy — one failed sweep must not crash the process.
      console.error("❌ Error in scheduled Action Item reminder job:", error);
    }
  });

  isInitialized = true;
  console.log("✅ Action Item reminder job scheduled (*/15 * * * *)");
};

/**
 * Stop the action-item reminder cron job and clear registration state.
 * Safe to call when the job was never started.
 */
export const stopActionItemReminderJob = () => {
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
  }

  if (isInitialized) {
    isInitialized = false;
    console.log("Action Item reminder job stopped");
  }
};

export const isActionItemReminderJobInitialized = () => isInitialized;

export default startActionItemReminderJob;
