import apiClient from './apiClient'

export const getQuizForMeeting = async (meetingId) => {
  const response = await apiClient.get(`/api/meetings/${meetingId}/quiz`)
  return response.data
}

export const submitQuizResponse = async (meetingId, answers) => {
  const response = await apiClient.post(`/api/meetings/${meetingId}/quiz/submit`, { answers })
  return response.data
}

export const getQuizAnalytics = async (meetingId) => {
  const response = await apiClient.get(`/api/meetings/${meetingId}/quiz/analytics`)
  return response.data
}
