import apiClient from "./apiClient.js";

const reportApi = {
  getTemplates: async () => {
    const response = await apiClient.get("/api/reports/templates");
    return response.data;
  },

  getTemplateById: async (id) => {
    const response = await apiClient.get(`/api/reports/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await apiClient.post("/api/reports/templates", data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await apiClient.put(`/api/reports/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id) => {
    const response = await apiClient.delete(`/api/reports/templates/${id}`);
    return response.data;
  },

  generateReport: async (id, filterOverrides = {}) => {
    const response = await apiClient.post(`/api/reports/generate/${id}`, {
      filterOverrides,
    });
    return response.data;
  },

  exportReport: async (id, format = "csv", filterOverrides = {}) => {
    const response = await apiClient.post(
      `/api/reports/export/${id}`,
      { format, filterOverrides },
      { responseType: "blob" },
    );
    return response;
  },
};

export default reportApi;
