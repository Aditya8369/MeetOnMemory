import cron from "node-cron";
import Organization from "../models/organizationModel.js";
import { generateInsight } from "../services/weeklyInsightService.js";

let isInitialized = false;
let weeklyInsightTask = null;

export const startWeeklyInsightJob = () => {
  if (isInitialized) {
    console.warn("⚠️ WeeklyInsightJob already initialized");
    return;
  }

  // Runs every Monday at 08:00
  weeklyInsightTask = cron.schedule("0 8 * * 1", async () => {
    console.log("[WeeklyInsightJob] Starting weekly insight generation...");
    try {
      const organizations = await Organization.find({});

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      for (const org of organizations) {
        try {
          await generateInsight(org._id, startDate, endDate);
          console.log(
            `[WeeklyInsightJob] Generated insight for org ${org._id}`,
          );
        } catch (orgErr) {
          console.error(
            `[WeeklyInsightJob] Error generating insight for org ${org._id}:`,
            orgErr,
          );
        }
      }
      console.log("[WeeklyInsightJob] Weekly insight generation completed.");
    } catch (err) {
      console.error("[WeeklyInsightJob] Error in weekly insight job:", err);
    }
  });

  isInitialized = true;
  console.log("✅ WeeklyInsightJob scheduled (Monday 08:00)");
};

export const stopWeeklyInsightJob = () => {
  if (weeklyInsightTask) {
    weeklyInsightTask.stop();
    weeklyInsightTask = null;
  }
  isInitialized = false;
  console.log("WeeklyInsightJob stopped");
};

export default startWeeklyInsightJob;
