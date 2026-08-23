import apiClient from './apiClient.js'

export const adminImportanceApi = {
  /**
   * Fetch importance recalculation queue status, memory statistics, and last run metadata.
   */
  getStatus: () => apiClient.get('/api/admin/importance/status'),

  /**
   * Trigger recalculation of importance scores for the organization.
   */
  triggerRecalculation: () => apiClient.post('/api/admin/importance/recalculate'),
}

export default adminImportanceApi
