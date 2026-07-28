import apiClient from "./apiClient";

export const knowledgeApi = {
  getActionItems: (status = "all", sortBy = "createdAt") =>
    apiClient.get(
      `/api/knowledge/action-items?status=${status}&sortBy=${sortBy}`,
    ),
  updateActionItemStatus: (id, status) =>
    apiClient.patch(`/api/knowledge/action-items/${id}`, { status }),
  getDecisions: (sortBy = "createdAt", status) =>
    apiClient.get(
      `/api/knowledge/decisions?sortBy=${sortBy}${status ? `&status=${status}` : ""}`,
    ),
  getDecisionLineage: (decisionId) =>
    apiClient.get(`/api/knowledge/decisions/${decisionId}/lineage`),
  submitFeedback: (type, id, rating) =>
    apiClient.patch(`/api/knowledge/${type}/${id}/feedback`, { rating }),
  recalculateImportance: () =>
    apiClient.post(`/api/knowledge/importance/recalculate`),
  // Memory Consolidation Engine
  runConsolidation: ({ dryRun = true, models } = {}) =>
    apiClient.post(`/api/knowledge/consolidate`, {
      dryRun,
      ...(models ? { models } : {}),
    }),
  getConsolidationHistory: (model = "decision", limit = 50) =>
    apiClient.get(
      `/api/knowledge/consolidation/history?model=${model}&limit=${limit}`,
    ),
  // Memory Graph Snapshot & Time-Travel
  getGraphSnapshots: ({ limit = 50, before } = {}) =>
    apiClient.get(
      `/api/knowledge/graph/snapshots?limit=${limit}${before ? `&before=${before}` : ""}`,
    ),
  getGraphSnapshot: (id) =>
    apiClient.get(`/api/knowledge/graph/snapshots/${id}`),
  exportGraphSnapshot: (id) =>
    apiClient.get(`/api/knowledge/graph/snapshots/${id}/export`),
  diffGraphSnapshots: (fromId, toId) =>
    apiClient.get(
      `/api/knowledge/graph/snapshots/diff?from=${fromId}&to=${toId}`,
    ),
  createGraphSnapshot: (force = false) =>
    apiClient.post(`/api/knowledge/graph/snapshots`, { force }),
  // AI-Powered Contradiction Detection & Conflict Resolution (#375, #715)
  scanForConflicts: ({
    dryRun = false,
    models,
    useAI = true,
    minConfidence,
  } = {}) =>
    apiClient.post(`/api/knowledge/conflicts/scan`, {
      dryRun,
      ...(models ? { models } : {}),
      useAI,
      ...(minConfidence !== undefined ? { minConfidence } : {}),
    }),
  getConflicts: ({ model, status = "open", limit = 50 } = {}) =>
    apiClient.get(
      `/api/knowledge/conflicts?status=${status}&limit=${limit}${model ? `&model=${model}` : ""}`,
    ),
  getConflictDetail: (conflictId) =>
    apiClient.get(`/api/knowledge/conflicts/${conflictId}`),
  resolveConflict: (
    conflictId,
    { resolutionType, keptMemoryId, customValue, note },
  ) =>
    apiClient.post(`/api/knowledge/conflicts/${conflictId}/resolve`, {
      resolutionType,
      ...(keptMemoryId ? { keptMemoryId } : {}),
      ...(customValue ? { customValue } : {}),
      ...(note ? { note } : {}),
    }),
};
