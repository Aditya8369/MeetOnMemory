import cron from "node-cron";
import StandupPreference from "../models/standupPreferenceModel.js";
import { generateStandupReport } from "../services/standupReportService.js";

let isInitialized = false;
let standupReportTask = null;

export const startStandupReportJob = () => {
  if (isInitialized) {
    console.warn("⚠️ StandupReportJob already initialized");
    return;
  }

  // Runs every hour to check for preferences that match the current hour
  standupReportTask = cron.schedule("0 * * * *", async () => {
    console.log("[StandupReportJob] Checking for due standup reports...");
    try {
      const currentHour = new Date().getHours().toString().padStart(2, "0"); // "00" to "23"

      // We will look for preferences where timeOfDay roughly matches the current hour.
      // E.g. "09:00" -> hour 09
      const prefs = await StandupPreference.find({
        scheduleType: { $in: ["daily", "weekly"] },
        timeOfDay: { $regex: `^${currentHour}:` },
      });

      for (const pref of prefs) {
        try {
          const now = new Date();
          // If weekly, only run on Monday (1)
          if (pref.scheduleType === "weekly" && now.getDay() !== 1) {
            continue;
          }

          const endDate = new Date();
          const startDate = new Date();
          if (pref.scheduleType === "daily") {
            startDate.setDate(startDate.getDate() - 1);
          } else {
            startDate.setDate(startDate.getDate() - 7);
          }

          await generateStandupReport(
            pref.user,
            pref.organization,
            pref.scheduleType,
            startDate,
            endDate,
          );

          console.log(
            `[StandupReportJob] Generated report for user ${pref.user} in org ${pref.organization}`,
          );

          // TODO: If pref.deliveryChannels contains "slack" or "email", dispatch notifications here.
        } catch (prefErr) {
          console.error(
            `[StandupReportJob] Error generating report for user ${pref.user}:`,
            prefErr,
          );
        }
      }
      console.log(
        "[StandupReportJob] Due standup reports generation completed.",
      );
    } catch (err) {
      console.error("[StandupReportJob] Error in standup report job:", err);
    }
  });

  isInitialized = true;
  console.log("✅ StandupReportJob scheduled (hourly)");
};

export const stopStandupReportJob = () => {
  if (standupReportTask) {
    standupReportTask.stop();
    standupReportTask = null;
  }
  isInitialized = false;
  console.log("StandupReportJob stopped");
};

export default startStandupReportJob;
