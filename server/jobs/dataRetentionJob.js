import cron from "node-cron";
import DataRetentionPolicy from "../models/dataRetentionPolicyModel.js";
import DataRetentionService from "../services/dataRetentionService.js";

/** @type {import("node-cron").ScheduledTask | null} */
let dataRetentionTask = null;

export const initDataRetentionJob = () => {
  // Run daily at 2:00 AM off-peak
  dataRetentionTask = cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[DataRetentionJob] Starting data retention sweep...");

      const activePolicies = await DataRetentionPolicy.find({ enabled: true });

      console.log(
        `[DataRetentionJob] Found ${activePolicies.length} organizations with active policies.`,
      );

      for (const policy of activePolicies) {
        try {
          const result = await DataRetentionService.executeSweep(
            policy.organization,
            "system",
          );
          console.log(
            `[DataRetentionJob] Completed sweep for org ${policy.organization}: Archived ${result.archivedCount}, Deleted ${result.deletedCount}`,
          );
        } catch (error) {
          console.error(
            `[DataRetentionJob] Failed sweep for org ${policy.organization}:`,
            error.message,
          );
        }
      }
    } catch (err) {
      console.error("[DataRetentionJob] Job failed:", err);
    }
  });

  console.log("Data retention cron job registered");
};

export const stopDataRetentionJob = () => {
  if (dataRetentionTask) {
    dataRetentionTask.stop();
    dataRetentionTask = null;
  }
};
