import api from "./api";

/**
 * Knowledge API Service
 * Handles all requests related to decisions, action items, and lifecycle management.
 */
export const knowledgeApi = {
  /**
   * Fetch decisions with optional sorting and pagination
   */
  getDecisions: async (sortBy = "createdAt", order = "desc", params = {}) => {
    return api.get("/api/knowledge/decisions", {
      params: {
        sortBy,
        order,
        ...params, // Includes page, limit, lifecycleState, search, etc.
      },
    });
  },

  /**
   * Fetch action items with optional sorting and pagination
   */
  getActionItems: async (status = "all", sortBy = "createdAt", params = {}) => {
    return api.get("/api/knowledge/action-items", {
      params: {
        status,
        sortBy,
        ...params, // Includes page, limit, lifecycleState, search, etc.
      },
    });
  },

  /**
   * Update the lifecycle state of a memory (decision or action item)
   */
  updateMemoryLifecycleState: async (type, id, newState, reason) => {
    return api.put(`/api/knowledge/${type}/${id}/lifecycle`, {
      state: newState,
      reason,
    });
  },

  /**
   * Trigger a manual lifecycle sweep for the organization
   */
  runLifecycleSweep: async () => {
    return api.post("/api/knowledge/lifecycle/sweep");
  },

  /**
   * Fetch decision lineage for the timeline
   */
  getDecisionLineage: async (decisionId) => {
    return api.get(`/api/knowledge/decisions/${decisionId}/lineage`);
  },

  /**
   * Submit feedback for a memory item
   */
  submitFeedback: async (type, id, rating) => {
    return api.patch(`/api/knowledge/${type}/${id}/feedback`, { rating });
  },

  /**
   * Recalculate importance scores for all memories
   */
  recalculateImportance: async () => {
    return api.post(`/api/knowledge/importance/recalculate`);
  },

  /**
   * Toggle reminder status for an action item
   */
  toggleActionItemReminder: async (id, enabled) => {
    return api.patch(`/api/knowledge/action-items/${id}/reminders`, { enabled });
  },

  /**
   * Update the status of an action item
   */
  updateActionItemStatus: async (id, status) => {
    return api.patch(`/api/knowledge/action-items/${id}`, { status });
  },
};

export default knowledgeApi;
