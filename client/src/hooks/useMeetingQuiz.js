import { useState, useCallback } from 'react'
import {
  getQuizForMeeting,
  submitQuizResponse,
  getQuizAnalytics,
} from '../services/meetingQuizApi.js'

export const useMeetingQuiz = (meetingId) => {
  const [quizData, setQuizData] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getQuizForMeeting(meetingId)
      setQuizData(data)
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to fetch quiz')
      }
    } finally {
      setLoading(false)
    }
  }, [meetingId])

  const submitAnswers = useCallback(
    async (answers) => {
      setLoading(true)
      setError(null)
      try {
        const result = await submitQuizResponse(meetingId, answers)
        setQuizData({
          quiz: result.quiz,
          response: result.response,
        })
        return result
      } catch (err) {
        setError('Failed to submit quiz')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [meetingId],
  )

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getQuizAnalytics(meetingId)
      setAnalytics(data)
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to fetch quiz analytics')
      }
    } finally {
      setLoading(false)
    }
  }, [meetingId])

  return {
    quizData,
    analytics,
    loading,
    error,
    fetchQuiz,
    submitAnswers,
    fetchAnalytics,
  }
}
