import { generateCachedMeetingSummary } from "./meetingSummaryCache.js";

/**
 * Generate summaries for multiple meetings while preserving input order.
 *
 * The cache layer deduplicates identical work, so repeated requests for the
 * same meeting/transcript do not trigger another Gemini call. A concurrency
 * limit prevents a large request from flooding the AI provider.
 */
export const generateMeetingSummariesBatch = async (
  meetings,
  generateSummary,
  { concurrency = 4 } = {},
) => {
  if (!Array.isArray(meetings) || meetings.length === 0) {
    return [];
  }

  const limit = Math.max(1, Number(concurrency) || 1);
  const results = new Array(meetings.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < meetings.length) {
      const index = cursor++;
      const meeting = meetings[index];

      results[index] = await generateCachedMeetingSummary({
        meetingId: meeting.id ?? meeting._id ?? null,
        transcript: meeting.transcript ?? "",
        date: meeting.date ?? null,
        title: meeting.title ?? null,
        customInstructions: meeting.customInstructions ?? null,
        generator: () => generateSummary(meeting),
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, meetings.length) }, worker),
  );

  return results;
};
