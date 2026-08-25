import apiClient from "./apiClient";

const aiSummaryTemplateApi = {
  createTemplate: (data) => apiClient.post("/api/ai-summary-templates", data),
  getTemplates: () => apiClient.get("/api/ai-summary-templates"),
  getTemplateById: (id) => apiClient.get(`/api/ai-summary-templates/${id}`),
  updateTemplate: (id, data) =>
    apiClient.put(`/api/ai-summary-templates/${id}`, data),
  deleteTemplate: (id) => apiClient.delete(`/api/ai-summary-templates/${id}`),
  setDefaultTemplate: (id) =>
    apiClient.put(`/api/ai-summary-templates/${id}/default`),
  testTemplate: (data) =>
    apiClient.post(`/api/ai-summary-templates/test`, data),
};

export default aiSummaryTemplateApi;
