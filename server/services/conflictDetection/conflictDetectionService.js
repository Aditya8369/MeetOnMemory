// ==============================================
// 📘 conflictDetectionService.js
// AI-Powered Contradiction Detection and Memory Conflict Resolution
// (Issue #375).
//
// The knowledge graph stores "memories" as Decision and ActionItem
// documents. As meetings accumulate, memories can start to contradict
// each other ("Project deadline is July 15" vs "Project deadline is
// July 22"). This service periodically scans active memories, groups
// contradictory ones into review sets, assigns a confidence score and an
// AI-generated explanation, and exposes a resolution workflow that keeps
// full history for auditing.
//
// Structurally mirrors memoryConsolidationService.js (Memory
// Consolidation Engine) on purpose — same organization-scoping, same
// dry-run-by-default convention, same union-find clustering shape —
// since the two engines solve adjacent problems (duplicates vs.
// contradictions) over the same data.
// ==============================================

import {
  MODEL_REGISTRY,
  assertSupportedModel,
} from "../consolidation/consolidationRegistry.js";
import {
  DEFAULT_MIN_CONFIDENCE,
  DEFAULT_TOPIC_EMBEDDING_THRESHOLD,
  DEFAULT_DUPLICATE_EMBEDDING_CEILING,
  detectContradiction,
  isSameTopic,
} from "./ContradictionAnalyzer.js";
import {
  buildConflictClusters,
  fetchMemoriesForConflictScan,
} from "./ConflictAggregator.js";
import {
  storeConflictCluster,
  resolveConflictSet,
  listConflictSets,
  getConflictSetById,
} from "./ConflictStorage.js";

/**
 * Runs the full contradiction-detection pipeline for a single memory
 * type, scoped to an organization (or global/null-org memories).
 */
export async function detectConflictsForModel(
  modelType,
  {
    organization = null,
    dryRun = true,
    useAI = true,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    topicEmbeddingThreshold = DEFAULT_TOPIC_EMBEDDING_THRESHOLD,
    duplicateEmbeddingCeiling = DEFAULT_DUPLICATE_EMBEDDING_CEILING,
  } = {},
) {
  const { Model } = assertSupportedModel(modelType);

  const records = await fetchMemoriesForConflictScan(Model, organization);

  const { clusters, pairwiseByCluster } = await buildConflictClusters(records, {
    useAI,
    minConfidence,
    topicEmbeddingThreshold,
    duplicateEmbeddingCeiling,
  });

  const conflictSummaries = [];
  for (let i = 0; i < clusters.length; i++) {
    const summary = await storeConflictCluster(
      modelType,
      clusters[i],
      pairwiseByCluster[i],
      { organization, dryRun },
    );
    if (summary) conflictSummaries.push(summary);
  }

  return {
    modelType,
    recordsScanned: records.length,
    conflictsFound: clusters.length,
    conflicts: conflictSummaries,
  };
}

/**
 * Entry point for the Contradiction Detection engine. Runs across the
 * requested memory types (default: all supported types) for a given
 * organization and returns a combined report. Defaults to a dry run so
 * conflicts can be previewed before being persisted for review, matching
 * the Consolidation engine's convention.
 */
export async function detectConflicts({
  organization = null,
  dryRun = true,
  useAI = true,
  models = Object.keys(MODEL_REGISTRY),
  minConfidence = DEFAULT_MIN_CONFIDENCE,
} = {}) {
  const invalidModels = models.filter((m) => !MODEL_REGISTRY[m]);
  if (invalidModels.length) {
    throw new Error(`Unsupported memory type(s): ${invalidModels.join(", ")}`);
  }

  const results = {};
  for (const modelType of models) {
    results[modelType] = await detectConflictsForModel(modelType, {
      organization,
      dryRun,
      useAI,
      minConfidence,
    });
  }

  const totalConflictsFound = Object.values(results).reduce(
    (sum, r) => sum + r.conflictsFound,
    0,
  );

  return {
    dryRun,
    organization: organization ? organization.toString() : null,
    totalConflictsFound,
    results,
  };
}

export async function detectMeetingConflicts({
  meetingId,
  organization = null,
  dryRun = true,
  useAI = true,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
} = {}) {
  if (!meetingId) {
    throw new Error("meetingId is required for meeting conflict scan");
  }

  const results = {};
  for (const modelType of Object.keys(MODEL_REGISTRY)) {
    const { Model } = assertSupportedModel(modelType);
    const meetingRecords = await Model.find({
      $or: [
        { sourceMeetingId: meetingId },
        { meetingId },
        { meeting: meetingId },
      ],
      status: { $ne: "superseded" },
    }).lean();

    if (!meetingRecords.length) {
      results[modelType] = {
        modelType,
        recordsScanned: 0,
        conflictsFound: 0,
        conflicts: [],
      };
      continue;
    }

    const meetingRecordIds = new Set(
      meetingRecords.map((r) => r._id.toString()),
    );
    const allOrgRecords = await fetchMemoriesForConflictScan(
      Model,
      organization,
    );

    const pairwiseConflicts = [];
    for (const mRecord of meetingRecords) {
      for (const otherRecord of allOrgRecords) {
        if (mRecord._id.toString() === otherRecord._id.toString()) continue;

        const analysis = await detectContradiction(mRecord, otherRecord, {
          useAI,
          minConfidence,
        });

        if (analysis.isContradiction) {
          pairwiseConflicts.push({
            members: [mRecord, otherRecord],
            analysis,
          });
        }
      }
    }

    const { clusters, pairwiseByCluster } = await buildConflictClusters(
      allOrgRecords.filter((r) =>
        pairwiseConflicts.some((pc) =>
          pc.members.some((m) => m._id.toString() === r._id.toString()),
        ),
      ),
      { useAI, minConfidence },
    );

    const meetingClusters = [];
    const meetingPairwise = [];
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (cluster.some((r) => meetingRecordIds.has(r._id.toString()))) {
        meetingClusters.push(cluster);
        meetingPairwise.push(pairwiseByCluster[i]);
      }
    }

    const conflictSummaries = [];
    for (let i = 0; i < meetingClusters.length; i++) {
      const summary = await storeConflictCluster(
        modelType,
        meetingClusters[i],
        meetingPairwise[i],
        { organization, dryRun },
      );
      if (summary) conflictSummaries.push(summary);
    }

    results[modelType] = {
      modelType,
      recordsScanned: meetingRecords.length,
      conflictsFound: meetingClusters.length,
      conflicts: conflictSummaries,
    };
  }

  const totalConflictsFound = Object.values(results).reduce(
    (sum, r) => sum + r.conflictsFound,
    0,
  );

  return {
    meetingId: meetingId.toString(),
    dryRun,
    organization: organization ? organization.toString() : null,
    totalConflictsFound,
    results,
  };
}

export async function getMeetingConflicts(
  meetingId,
  { organization = null, status = "open" } = {},
) {
  const allConflicts = await listConflictSets(null, {
    organization,
    status,
    limit: 200,
  });
  const meetingIdStr = meetingId.toString();

  return allConflicts.filter((cs) =>
    (cs.memberSnapshots || []).some(
      (m) =>
        m.sourceMeetingId?.toString() === meetingIdStr ||
        m.meetingId?.toString() === meetingIdStr ||
        m.meeting?.toString() === meetingIdStr,
    ),
  );
}

export {
  MODEL_REGISTRY,
  DEFAULT_MIN_CONFIDENCE,
  DEFAULT_TOPIC_EMBEDDING_THRESHOLD,
  DEFAULT_DUPLICATE_EMBEDDING_CEILING,
  detectContradiction,
  isSameTopic,
  resolveConflictSet,
  listConflictSets,
  getConflictSetById,
};
