import { recalculateAllImportanceScores } from "../services/importanceScoringService.js";
import Organization from "../models/organizationModel.js";

export default async function recalculateImportanceJob(job) {
  const { organization } = job.data;
  console.log(
    `🤖 Starting background importance score recalculation for organization ${organization}...`,
  );
  try {
    const results = await recalculateAllImportanceScores({ organization });
    console.log(
      `✅ Completed background importance score recalculation:`,
      results,
    );
    if (organization) {
      await Organization.updateOne(
        { _id: organization },
        {
          $set: {
            "metadata.lastImportanceRecalculationStatus": "completed",
            "metadata.lastImportanceRecalculationAt": new Date(),
            "metadata.lastImportanceRecalculationResults": results,
            "metadata.lastImportanceRecalculationError": null,
          },
        },
      );
    }
    return results;
  } catch (error) {
    console.error(
      `❌ Background importance score recalculation failed:`,
      error.message,
    );
    if (organization) {
      await Organization.updateOne(
        { _id: organization },
        {
          $set: {
            "metadata.lastImportanceRecalculationStatus": "failed",
            "metadata.lastImportanceRecalculationError": error.message,
          },
        },
      );
    }
    throw error;
  }
}
