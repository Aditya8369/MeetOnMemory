import Meeting from "../models/meetingModel.js";
import MeetingQuiz from "../models/meetingQuizModel.js";
import { generateText, parseJsonOutput } from "./GenerativeAIService.js";

export const generateQuizFromTranscript = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  const { transcript, structuredMoM } = meeting;
  if (!transcript && !structuredMoM) {
    throw new Error(
      `No transcript or summary available for meeting: ${meetingId}`,
    );
  }

  // Use transcript if available, otherwise fallback to the generated MoM
  const sourceText = transcript || JSON.stringify(structuredMoM, null, 2);

  const prompt = `
You are an AI learning assistant that creates quizzes to test knowledge retention after a meeting.
Based on the following meeting transcript/summary, create a 3-5 question multiple-choice quiz.
The questions must be based strictly on facts, decisions, or key discussions mentioned in the text.
Do not invent information.

Return ONLY a valid JSON object matching this structure (no markdown formatting, no backticks, no commentary):
{
  "questions": [
    {
      "questionText": "What was the main decision regarding X?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Brief explanation of why this is correct based on the meeting."
    }
  ]
}

Meeting Source Text:
${sourceText.substring(0, 20000)} // truncate if extremely long
`;

  let outputText;
  try {
    outputText = await generateText(prompt, "Gemini Meeting Quiz");
  } catch (err) {
    console.error("❌ Quiz generation failed:", err.message);
    throw new Error(`Quiz generation failed: ${err.message}`);
  }

  const parsed = parseJsonOutput(outputText);
  if (
    !parsed ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length === 0
  ) {
    throw new Error(
      "Failed to parse Gemini JSON output for meeting quiz or no questions generated",
    );
  }

  const quiz = await MeetingQuiz.create({
    meetingId,
    questions: parsed.questions,
  });

  return quiz;
};
