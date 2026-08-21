import DataRetentionPolicy from "../models/dataRetentionPolicyModel.js";
import Meeting from "../models/meetingModel.js";
import AuditService from "./AuditService.js";

class DataRetentionService {
  static async getPolicy(organizationId) {
    let policy = await DataRetentionPolicy.findOne({
      organization: organizationId,
    });
    if (!policy) {
      policy = await DataRetentionPolicy.create({
        organization: organizationId,
      });
    }
    return policy;
  }

  static async updatePolicy(organizationId, updateData, actorId) {
    const policy = await DataRetentionPolicy.findOneAndUpdate(
      { organization: organizationId },
      { $set: updateData },
      { new: true, upsert: true },
    );

    await AuditService.logAction({
      actorId,
      action: "DATA_RETENTION_POLICY_UPDATED",
      entity: "DataRetentionPolicy",
      entityId: policy._id,
      organizationId,
      details: { updateData },
    });

    return policy;
  }

  static async getSweepPreview(organizationId) {
    const policy = await DataRetentionPolicy.findOne({
      organization: organizationId,
    });
    if (!policy || !policy.enabled) {
      return { archivedCount: 0, deletedCount: 0 };
    }

    const now = new Date();
    const retentionDate = new Date(
      now.getTime() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000,
    );
    const expirationDate = new Date(
      now.getTime() -
        (policy.retentionPeriodDays + policy.gracePeriodDays) *
          24 *
          60 *
          60 *
          1000,
    );

    const baseQuery = {
      organization: organizationId,
    };

    if (policy.exemptTags && policy.exemptTags.length > 0) {
      baseQuery.tags = { $nin: policy.exemptTags };
    }

    const archivedCount = await Meeting.countDocuments({
      ...baseQuery,
      createdAt: { $lte: retentionDate, $gt: expirationDate },
      deletedAt: null,
    });

    const deletedCount = await Meeting.countDocuments({
      ...baseQuery,
      createdAt: { $lte: expirationDate },
    });

    return { archivedCount, deletedCount };
  }

  static async executeSweep(organizationId, actorId = null) {
    const policy = await DataRetentionPolicy.findOne({
      organization: organizationId,
    });
    if (!policy || !policy.enabled) {
      return { archivedCount: 0, deletedCount: 0 };
    }

    const now = new Date();
    const retentionDate = new Date(
      now.getTime() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000,
    );
    const expirationDate = new Date(
      now.getTime() -
        (policy.retentionPeriodDays + policy.gracePeriodDays) *
          24 *
          60 *
          60 *
          1000,
    );

    const baseQuery = {
      organization: organizationId,
    };

    if (policy.exemptTags && policy.exemptTags.length > 0) {
      baseQuery.tags = { $nin: policy.exemptTags };
    }

    // Soft delete items entering grace period
    const archiveQuery = {
      ...baseQuery,
      createdAt: { $lte: retentionDate, $gt: expirationDate },
      deletedAt: null,
    };

    const archiveResult = await Meeting.updateMany(archiveQuery, {
      $set: {
        deletedAt: now,
        deletionReason: "Automated Data Retention Policy (Grace Period)",
        ...(actorId && { deletedBy: actorId }),
      },
    });

    // Hard delete expired items
    const deleteQuery = {
      ...baseQuery,
      createdAt: { $lte: expirationDate },
    };

    const deleteResult = await Meeting.deleteMany(deleteQuery);

    const runLog = {
      runAt: now,
      archivedCount: archiveResult.modifiedCount,
      deletedCount: deleteResult.deletedCount,
      status: "success",
    };

    policy.lastRunAt = now;
    policy.runHistory.push(runLog);
    // Keep only last 50 logs
    if (policy.runHistory.length > 50) {
      policy.runHistory = policy.runHistory.slice(-50);
    }
    await policy.save();

    if (archiveResult.modifiedCount > 0 || deleteResult.deletedCount > 0) {
      await AuditService.logAction({
        actorId: actorId || organizationId, // fallback if system
        action: "DATA_RETENTION_SWEEP_EXECUTED",
        entity: "DataRetentionPolicy",
        entityId: policy._id,
        organizationId,
        details: {
          archivedCount: archiveResult.modifiedCount,
          deletedCount: deleteResult.deletedCount,
        },
      });
    }

    return {
      archivedCount: archiveResult.modifiedCount,
      deletedCount: deleteResult.deletedCount,
    };
  }
}

export default DataRetentionService;
