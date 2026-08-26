import PolicyCompliance from "../models/policyComplianceModel.js";
import { reevaluatePolicyComplianceRecord } from "../services/policyComplianceService.js";

/**
 * BullMQ processor for user-requested policy compliance retries.
 * Job data is { recordId, organizationId } and is always re-checked against
 * the stored record before any LLM work is performed.
 */
export default async function policyComplianceReevaluationJob(job) {
  const { recordId, organizationId } = job.data || {};
  if (!recordId || !organizationId) {
    throw new Error("Policy compliance retry job is missing required data");
  }

  const record = await PolicyCompliance.findOne({
    _id: recordId,
    organization: organizationId,
    classification: "unclassified",
  });

  if (!record) {
    return { skipped: true, reason: "Record is no longer retryable" };
  }

  const result = await reevaluatePolicyComplianceRecord(record);
  return result ? { skipped: false, recordId: result._id } : { skipped: true };
}
