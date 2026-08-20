import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import WeeklyInsight from "../models/weeklyInsightModel.js";
import { generateText, parseJsonOutput } from "./GenerativeAIService.js";
import { NotFoundError } from "../utils/errors.js";

/**
 * Generates a weekly insight for a given organization.
 * @param {string} organizationId
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const generateInsight = async (organizationId, startDate, endDate) => {
  // Fetch meetings in the date range
  const meetings = await Meeting.find({
    organization: organizationId,
    date: { $gte: startDate, $lte: endDate },
    status: "completed",
  });

  if (!meetings || meetings.length === 0) {
    return null; // No meetings to analyze
  }

  const meetingIds = meetings.map((m) => m._id);

  // Fetch action items for these meetings
  const actionItems = await ActionItem.find({
    sourceMeetingId: { $in: meetingIds },
    status: { $in: ["open", "in-progress", "pending"] },
  });

  // Prepare prompt context
  const meetingsContext = meetings
    .map((m) => {
      return `Meeting: ${m.title} (${m.date.toISOString().split("T")[0]})\nSummary: ${m.summary || "No summary"}\n`;
    })
    .join("\n");

  const actionItemsContext = actionItems
    .map((a) => {
      return `Action Item: ${a.text} [Status: ${a.status}, Owner: ${a.owner}]`;
    })
    .join("\n");

  const prompt = `
You are a strategic AI assistant analyzing an organization's meetings from the past week.
Analyze the following meetings and unresolved action items.

Meetings:
${meetingsContext}

Action Items:
${actionItemsContext}

Provide a comprehensive Weekly Digest containing:
1. "aiSummary": A 2-3 paragraph strategic summary of the week, highlighting major themes, achievements, and bottlenecks.
2. "recurringTopics": An array of 3-5 recurring topics discussed across multiple meetings. For each, provide a "name" and a brief "description".
3. "stalledActionItems": Pick out 3-5 action items that seem stalled or bottlenecked based on the context. Provide the "text". (I will try to match this text back to the database).
4. "decisionConflicts": An array of conflicts detected across decisions or statements made. Provide a brief "description" for each.
5. "participationTrends": A 1-2 sentence summary of any noticeable participation or focus trends.

Return ONLY a valid JSON object matching this schema exactly:
{
  "aiSummary": "...",
  "recurringTopics": [
    { "name": "...", "description": "..." }
  ],
  "stalledActionItems": [
    { "text": "..." }
  ],
  "decisionConflicts": [
    { "description": "..." }
  ],
  "participationTrends": "..."
}
`;

  const aiOutput = await generateText(prompt, "Weekly Insights Generation");
  const parsed = parseJsonOutput(aiOutput);

  if (!parsed) {
    throw new Error("Failed to parse AI output for Weekly Insight");
  }

  // Attempt to link stalled action items back to their DB records
  const stalledLinked = (parsed.stalledActionItems || []).map((aiStalled) => {
    // fuzzy match based on text
    const matched = actionItems.find(
      (dbItem) =>
        dbItem.text.includes(aiStalled.text) ||
        aiStalled.text.includes(dbItem.text),
    );
    return {
      actionItem: matched ? matched._id : null,
      text: aiStalled.text,
      meetingId: matched ? matched.sourceMeetingId : null,
    };
  });

  const insight = new WeeklyInsight({
    organization: organizationId,
    startDate,
    endDate,
    aiSummary: parsed.aiSummary || "",
    recurringTopics: parsed.recurringTopics || [],
    stalledActionItems: stalledLinked,
    decisionConflicts: parsed.decisionConflicts || [],
    participationTrends: parsed.participationTrends || "",
  });

  await insight.save();
  return insight;
};
