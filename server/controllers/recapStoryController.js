import axios from "axios";
import dotenv from "dotenv";
import Meeting from "../models/meetingModel.js";
import KeyMoment from "../models/keyMomentModel.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

dotenv.config();

export const getMeetingStory = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    if (meeting.recapStory) {
      return sendSuccess(res, { story: meeting.recapStory });
    }

    const keyMoments = await KeyMoment.find({ meetingId });

    const prompt = `
You are an expert at creating engaging, Instagram-style "Story" summaries.
I have a meeting with the following details:
Title: ${meeting.title}
Date: ${meeting.date}
MoM (Structured): ${JSON.stringify(meeting.structuredMoM || "Not available")}
Key Moments: ${JSON.stringify(keyMoments || [])}

Generate EXACTLY 5 to 7 slides in JSON format representing the recap story.
Each slide object should have:
- "id": A unique string identifier.
- "type": One of "title", "tldr", "decisions", "highlight", "action_items", "vibe".
- "title": A bold headline for the slide (e.g., "The TL;DR", "Key Decisions Made").
- "content": The text content of the slide. Use emoji sparingly but effectively.
- "theme": One of "blue", "green", "violet", "amber", "rose".

The slides MUST cover:
1. Title, Attendees, & Vibe (Sentiment)
2. The TL;DR (1 sentence summary)
3. Key Decisions Made
4. Highlight of the Meeting (A transcribed quote or key moment)
5. Your Action Items

Respond ONLY with a valid JSON array of the slide objects. Do not wrap it in markdown code blocks like \`\`\`json.
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
    );

    let textResponse =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("No AI content generated");
    }

    // Clean up potential markdown formatting
    textResponse = textResponse
      .replace(/^\s*```json/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    let storyData;
    try {
      storyData = JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", textResponse);
      throw new Error("Invalid JSON format from Gemini");
    }

    // Cache the story
    meeting.recapStory = storyData;
    await meeting.save();

    return sendSuccess(res, { story: storyData });
  } catch (error) {
    console.error("Error generating meeting story:", error);
    return sendError(res, 500, "Failed to generate meeting story");
  }
};

export const getRecentStories = async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userId = req.user?.id || req.user?._id; // Ensure you have user auth middleware

    const recentMeetings = await Meeting.find({
      date: { $gte: oneDayAgo },
      deletedAt: null,
      $or: [{ uploadedBy: userId }, { "participants.user": userId }],
    })
      .sort({ date: -1 })
      .limit(10)
      .select("_id title date recapStory");

    return sendSuccess(res, { meetings: recentMeetings });
  } catch (error) {
    console.error("Error fetching recent stories:", error);
    return sendError(res, 500, "Failed to fetch recent stories");
  }
};
