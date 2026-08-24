import { generateQuizFromTranscript } from '../services/meetingQuizService.js'

export default async function meetingQuizJob(job, _app) {
  const { meetingId } = job.data

  try {
    console.log(`🧠 Generating Retention Quiz for meeting ${meetingId}...`)
    const quiz = await generateQuizFromTranscript(meetingId)
    console.log(
      `✅ Retention Quiz generated successfully for meeting ${meetingId}. Quiz ID: ${quiz._id}`,
    )

    return { success: true, quizId: quiz._id }
  } catch (error) {
    console.error(`⚠️ Failed to generate quiz for meeting ${meetingId}:`, error)
    // Depending on requirements, we could retry or just fail silently.
    // Throwing error allows bullmq to retry based on job configuration.
    throw error
  }
}
