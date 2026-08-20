import Meeting from "../models/meetingModel.js";
import Transcript from "../models/transcriptModel.js";
import SentimentTimeline from "../models/sentimentTimelineModel.js";
import { generateText, parseJsonOutput } from "./GenerativeAIService.js";

const CHUNK_DURATION_SEC = 120; // ~2 minutes

export const generateSentimentTimeline = async (meetingId) => {
  // 1. Check if timeline already exists and is not failed
  let timeline = await SentimentTimeline.findOne({ meeting: meetingId });
  if (timeline && ["completed", "processing"].includes(timeline.status)) {
    return timeline;
  }

  // Create or reset timeline
  if (!timeline) {
    timeline = new SentimentTimeline({
      meeting: meetingId,
      status: "processing",
    });
  } else {
    timeline.status = "processing";
    timeline.error = null;
    timeline.segments = [];
  }
  await timeline.save();

  try {
    // 2. Fetch meeting and transcript
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Set org
    timeline.organization = meeting.organization;

    const transcript = await Transcript.findOne({ meeting: meetingId });
    if (
      !transcript ||
      !transcript.segments ||
      transcript.segments.length === 0
    ) {
      throw new Error("Transcript not available for this meeting");
    }

    // 3. Chunk transcript into 2-minute segments
    const transcriptSegments = transcript.segments;
    const timeChunks = [];
    let currentChunk = {
      startTime: transcriptSegments[0].startTime,
      endTime: transcriptSegments[0].startTime + CHUNK_DURATION_SEC * 1000,
      text: "",
    };

    for (const segment of transcriptSegments) {
      if (segment.startTime > currentChunk.endTime) {
        if (currentChunk.text.trim()) {
          timeChunks.push(currentChunk);
        }
        currentChunk = {
          startTime: segment.startTime,
          endTime: segment.startTime + CHUNK_DURATION_SEC * 1000,
          text: "",
        };
      }
      currentChunk.text += `[${segment.speaker}]: ${segment.text}\n`;
      // Extend end time if segment goes past it, but keep it conceptually a chunk
      if (segment.endTime > currentChunk.endTime) {
        currentChunk.endTime = segment.endTime;
      }
    }
    if (currentChunk.text.trim()) {
      timeChunks.push(currentChunk);
    }

    // 4. Prompt Gemini for sentiment analysis
    const agendaText = meeting.agendaItems
      .map((item, idx) => `${idx + 1}. ${item.text}`)
      .join("\n");

    // Prepare prompt
    const prompt = `
You are an expert meeting analyst. Analyze the following transcript chunks and determine the sentiment for each chunk.
Also, map each chunk to the most relevant agenda item if applicable.

Meeting Agenda:
${agendaText || "No explicit agenda provided."}

Transcript Chunks:
${timeChunks.map((chunk, idx) => `Chunk ${idx + 1} (${chunk.startTime}ms to ${chunk.endTime}ms):\n${chunk.text}`).join("\n")}

Respond ONLY with a valid JSON object matching this schema:
{
  "segments": [
    {
      "startTime": 1234, // (integer, use exact startTime from prompt)
      "endTime": 5678,   // (integer, use exact endTime from prompt)
      "sentiment": "positive" | "neutral" | "negative",
      "score": 0.5,      // float between -1 (very negative) and 1 (very positive)
      "textSnippet": "Short key snippet that drove this sentiment",
      "agendaItemIndex": 0, // 0-based index of agenda item, or null if none
      "agendaItemText": "Text of the agenda item" // or null
    }
  ],
  "overallArc": "A 1-2 sentence description of how the meeting's emotional tone shifted over time."
}
`;

    const aiResponseText = await generateText(
      prompt,
      "Gemini sentiment timeline analysis",
    );
    const parsed = parseJsonOutput(aiResponseText);

    if (!parsed || !parsed.segments) {
      throw new Error("Failed to parse Gemini output");
    }

    // Map back onto the model
    timeline.segments = parsed.segments.map((seg) => ({
      startTime: seg.startTime,
      endTime: seg.endTime,
      sentiment: ["positive", "neutral", "negative"].includes(seg.sentiment)
        ? seg.sentiment
        : "neutral",
      score:
        typeof seg.score === "number"
          ? Math.max(-1, Math.min(1, seg.score))
          : 0,
      textSnippet: seg.textSnippet || "",
      agendaItemIndex:
        typeof seg.agendaItemIndex === "number" ? seg.agendaItemIndex : null,
      agendaItemText: seg.agendaItemText || null,
    }));
    timeline.overallArc = parsed.overallArc || "";
    timeline.status = "completed";

    await timeline.save();
    return timeline;
  } catch (error) {
    console.error("Error generating sentiment timeline:", error);
    timeline.status = "failed";
    timeline.error = error.message;
    await timeline.save();
    throw error;
  }
};
