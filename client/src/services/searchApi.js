import apiClient from "./apiClient";

/**
 * Client API service for AI, Hybrid, Federated, and Voice Search (#2010)
 */
export const searchApi = {
  /**
   * Voice-powered semantic search
   */
  voiceSearch: async (query) => {
    const response = await apiClient.get("/api/search/voice", {
      params: { query: query.trim() },
    });
    return response.data;
  },

  /**
   * Federated knowledge search across workspaces
   */
  federatedSearch: async (payload) => {
    const response = await apiClient.post("/api/search/federated", payload);
    return response.data;
  },

  /**
   * Hybrid vector + graph search
   */
  hybridSearch: async (payload) => {
    const response = await apiClient.post("/api/search/hybrid", payload);
    return response.data;
  },

  /**
   * Semantic vector search
   */
  semanticSearch: async (payload) => {
    const response = await apiClient.post("/api/search", payload);
    return response.data;
  },
};

export default searchApi;
