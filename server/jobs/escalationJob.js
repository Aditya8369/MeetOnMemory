import cron from "node-cron";
import { evaluateEscalations } from "../services/escalationService.js";

let isInitialized = false;
let escalationTask = null;

export const startEscalationJob = () => {
  if (isInitialized) {
    console.warn("⚠️ Escalation job already initialized");
    return;
  }

  // Run every hour
  escalationTask = cron.schedule("0 * * * *", async () => {
    try {
      console.log("⏰ Running scheduled Escalation job...");
      await evaluateEscalations();
    } catch (error) {
      console.error("❌ Error in scheduled Escalation job:", error);
    }
  });

  isInitialized = true;
  console.log("✅ Escalation job scheduled (0 * * * *)");
};

export const stopEscalationJob = () => {
  if (escalationTask) {
    escalationTask.stop();
    escalationTask = null;
  }

  if (isInitialized) {
    isInitialized = false;
    console.log("Escalation job stopped");
  }
};

export const isEscalationJobInitialized = () => isInitialized;

export default startEscalationJob;
