import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import MeetingBriefing from "../models/meetingBriefingModel.js";
import { hybridRetrieve } from "./hybridRetrievalService.js";
import { generateText, parseJsonOutput } from "./GenerativeAIService.js";

export const generateBriefing = async (meetingId) => {
  try {
    const meeting = await Meeting.findById(meetingId).populate(
      "participants.user",
      "name email",
    );

    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    let briefing = await MeetingBriefing.findOne({ meetingId });
    if (!briefing) {
      briefing = new MeetingBriefing({
        meetingId,
        organization: meeting.organization,
        status: "pending",
      });
      await briefing.save();
    }

    const orgId = meeting.organization ? meeting.organization.toString() : null;
    const query =
      `${meeting.title} ${meeting.description || ""}`.trim() || "meeting";

    let relatedMeetings = [];
    if (orgId) {
      try {
        const hybridRes = await hybridRetrieve(query, orgId, {
          topK: 5,
          includeTypes: ["meeting"],
        });
        relatedMeetings = hybridRes.results.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
        }));
      } catch (err) {
        console.warn(
          "Failed to retrieve related meetings for briefing:",
          err.message,
        );
      }
    }

    const participantEmails = meeting.participants
      .map((p) => p.user?.email || p.email)
      .filter(Boolean);

    let openActionItems = [];
    if (participantEmails.length > 0) {
      const participantNames = meeting.participants
        .map((p) => p.name)
        .filter(Boolean);
      openActionItems = await ActionItem.find({
        organization: orgId,
        status: { $in: ["open", "in-progress"] },
        owner: { $in: participantNames },
      })
        .select("text owner dueDate")
        .lean();
    }

    const prompt = `
You are an expert AI meeting preparation assistant. Your task is to generate a proactive "Pre-Meeting Briefing" document for an upcoming meeting.

Upcoming Meeting Details:
- Title: ${meeting.title}
- Date: ${meeting.date}
- Description: ${meeting.description || "N/A"}
- Attendees: ${meeting.participants.map((p) => p.name).join(", ")}

Related Past Meetings Context:
${JSON.stringify(relatedMeetings, null, 2)}

Open Action Items for Attendees:
${JSON.stringify(openActionItems, null, 2)}

Based on this context, generate a structured briefing in JSON format containing:
1. "executiveSummary": A short 2-3 paragraph summary setting the stage for what this meeting is about and what history exists.
2. "suggestedQuestions": A list of 3-5 strategic questions the attendees should consider asking based on past context and open action items.

Return ONLY valid JSON (no markdown formatting, no commentary):
{
  "executiveSummary": "...",
  "suggestedQuestions": ["...", "..."]
}
`;

    const generatedText = await generateText(
      prompt,
      "Pre-Meeting Briefing Generation",
    );
    const parsed = parseJsonOutput(generatedText) || {};

    briefing.executiveSummary =
      parsed.executiveSummary || "Summary could not be generated.";
    briefing.suggestedQuestions = Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions
      : [];
    briefing.relatedPastMeetings = relatedMeetings;
    briefing.openActionItems = openActionItems;
    briefing.status = "generated";
    briefing.generatedAt = new Date();

    await briefing.save();
    return briefing;
  } catch (error) {
    console.error("Error generating briefing:", error);
    await MeetingBriefing.findOneAndUpdate(
      { meetingId },
      { status: "failed", errorMessage: error.message },
    );
    throw error;
  }
};

export const getBriefing = async (meetingId) => {
  return await MeetingBriefing.findOne({ meetingId });
};
