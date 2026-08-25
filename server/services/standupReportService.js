import StandupReport from "../models/standupReportModel.js";
import ActionItem from "../models/actionItemModel.js";
import Meeting from "../models/meetingModel.js";
import Decision from "../models/decisionModel.js";
import User from "../models/userModel.js";
import { generateStandupReportAI } from "./GenerativeAIService.js";

/**
 * Gather data and generate a standup report for a specific user.
 * @param {string} userId
 * @param {string} organizationId
 * @param {string} type 'daily' | 'weekly'
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const generateStandupReport = async (
  userId,
  organizationId,
  type,
  startDate,
  endDate,
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Gather Meetings attended
  const meetings = await Meeting.find({
    organization: organizationId,
    date: { $gte: startDate, $lte: endDate },
    attendees: userId, // Assuming attendees array contains user references
    status: "completed",
  });

  const meetingIds = meetings.map((m) => m._id);

  const attendedMeetingsContext = meetings
    .map((m) => `Meeting: ${m.title} (${m.date.toISOString().split("T")[0]})`)
    .join("\n");

  const attendedMeetingsFormatted = meetings.map((m) => ({
    meeting: m._id,
    title: m.title,
    date: m.date,
  }));

  // Gather Decisions participated in during those meetings
  const decisions = await Decision.find({
    meeting: { $in: meetingIds },
  });

  const decisionsContext = decisions
    .map((d) => `Decision: ${d.text || d.description}`)
    .join("\n");

  const decisionsFormatted = decisions.map((d) => ({
    description: d.text || d.description || "Unknown Decision",
    meetingId: d.meeting,
  }));

  // Gather Action Items
  // 1. Completed within this timeframe
  const completedItems = await ActionItem.find({
    owner: userId,
    status: "completed",
    updatedAt: { $gte: startDate, $lte: endDate }, // Approximation of when it was completed
  });

  const completedItemsContext = completedItems
    .map((a) => `Task: ${a.text}`)
    .join("\n");

  const completedItemsFormatted = completedItems.map((a) => ({
    actionItem: a._id,
    text: a.text,
    meetingId: a.sourceMeetingId,
  }));

  // 2. Upcoming tasks (open, due soon)
  const upcomingItems = await ActionItem.find({
    owner: userId,
    status: { $in: ["open", "in-progress", "pending"] },
    dueDate: { $gte: new Date() },
  });

  const upcomingItemsContext = upcomingItems
    .map(
      (a) =>
        `Task: ${a.text} (Due: ${a.dueDate ? a.dueDate.toISOString().split("T")[0] : "None"})`,
    )
    .join("\n");

  const upcomingItemsFormatted = upcomingItems.map((a) => ({
    actionItem: a._id,
    text: a.text,
    dueDate: a.dueDate,
    meetingId: a.sourceMeetingId,
  }));

  // 3. Blockers (open, overdue, or explicitly blocked)
  const blockers = await ActionItem.find({
    owner: userId,
    $or: [
      { status: "blocked" },
      {
        status: { $in: ["open", "in-progress", "pending"] },
        dueDate: { $lt: new Date() },
      },
    ],
  });

  const blockersContext = blockers
    .map((a) => `Blocker/Overdue Task: ${a.text}`)
    .join("\n");

  const blockersFormatted = blockers.map((a) => ({
    actionItem: a._id,
    text: a.text,
    meetingId: a.sourceMeetingId,
  }));

  // Generate AI Summary
  const timeframeStr = `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`;
  const userName = user.displayName || user.name || user.email;

  const aiSummary = await generateStandupReportAI(
    userName,
    timeframeStr,
    attendedMeetingsContext || "None",
    completedItemsContext || "None",
    upcomingItemsContext || "None",
    blockersContext || "None",
    decisionsContext || "None",
  );

  // Save the report
  const report = new StandupReport({
    user: userId,
    organization: organizationId,
    type,
    date: new Date(),
    aiSummary,
    completedActionItems: completedItemsFormatted,
    upcomingActionItems: upcomingItemsFormatted,
    blockers: blockersFormatted,
    attendedMeetings: attendedMeetingsFormatted,
    decisions: decisionsFormatted,
  });

  await report.save();
  return report;
};
