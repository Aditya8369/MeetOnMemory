import MeetingNudge from "../models/meetingNudgeModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import Activity from "../models/activityModel.js";
import { createNotification } from "./notificationService.js";

export const evaluateUpcomingMeetings = async (hoursFromNow = 24) => {
  const now = new Date();
  const future = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

  // Find meetings happening in the next 24 hours that haven't happened yet
  const upcomingMeetings = await Meeting.find({
    date: { $gt: now, $lte: future },
    status: { $ne: "completed" },
    deletedAt: null,
  }).populate("participants.user");

  for (const meeting of upcomingMeetings) {
    for (const participant of meeting.participants) {
      if (participant.user) {
        await generateNudgesForParticipant(
          meeting,
          participant.user._id.toString(),
        );
      }
    }
  }
};

export const generateNudgesForParticipant = async (meeting, userId) => {
  // 1. Check for unresolved action items assigned to this user
  const unresolvedItems = await ActionItem.find({
    assignee: userId,
    status: { $in: ["open", "in-progress", "pending"] },
    organization: meeting.organization, // or related to same series
  });

  // 2. Check if user has viewed the meeting agenda/details
  const activity = await Activity.findOne({
    actor: userId,
    targetId: meeting._id,
    action: { $in: ["meeting.viewed", "agenda.viewed"] },
  });

  const hasViewedAgenda = !!activity;

  let score = 100;
  let unresolvedCount = unresolvedItems.length;

  if (unresolvedCount > 0) {
    score -= Math.min(50, unresolvedCount * 10);
  }
  if (!hasViewedAgenda) {
    score -= 20;
  }

  // Create or Update General Prep Nudge with Score
  await MeetingNudge.findOneAndUpdate(
    { meetingId: meeting._id, recipientId: userId, nudgeType: "GENERAL_PREP" },
    {
      organization: meeting.organization,
      context: { unresolvedCount, hasViewedAgenda, score },
      readinessScore: score,
    },
    { upsert: true, new: true },
  );

  if (unresolvedCount > 0) {
    const nudge = await MeetingNudge.findOneAndUpdate(
      {
        meetingId: meeting._id,
        recipientId: userId,
        nudgeType: "UNRESOLVED_ACTION_ITEMS",
      },
      {
        organization: meeting.organization,
        context: {
          count: unresolvedCount,
          itemIds: unresolvedItems.map((i) => i._id),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (
      nudge &&
      nudge.status === "PENDING" &&
      nudge.createdAt &&
      nudge.createdAt.getTime() > Date.now() - 60000
    ) {
      // Newly created
      createNotification({
        userId: userId,
        title: "Action Items Pending for Upcoming Meeting",
        message: `You have ${unresolvedCount} unresolved action items before ${meeting.title}.`,
        type: "NUDGE",
        organization: meeting.organization,
        link: `/meetings/${meeting._id}`,
      }).catch(console.error);
    }
  }

  if (!hasViewedAgenda) {
    const nudge = await MeetingNudge.findOneAndUpdate(
      {
        meetingId: meeting._id,
        recipientId: userId,
        nudgeType: "AGENDA_REVIEW",
      },
      {
        organization: meeting.organization,
        context: { message: "Review the agenda to prepare." },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (
      nudge &&
      nudge.status === "PENDING" &&
      nudge.createdAt &&
      nudge.createdAt.getTime() > Date.now() - 60000
    ) {
      // Newly created
      createNotification({
        userId: userId,
        title: "Agenda Review Reminder",
        message: `Please review the agenda for ${meeting.title}.`,
        type: "NUDGE",
        organization: meeting.organization,
        link: `/meetings/${meeting._id}`,
      }).catch(console.error);
    }
  }
};

export const getPersonalNudges = async (userId, organizationId) => {
  const query = { recipientId: userId, status: "PENDING" };
  if (organizationId) query.organization = organizationId;
  return MeetingNudge.find(query).populate("meetingId", "title date time");
};

export const updateNudgeStatus = async (nudgeId, status) => {
  return MeetingNudge.findByIdAndUpdate(nudgeId, { status }, { new: true });
};

export const getMeetingReadiness = async (meetingId) => {
  const nudges = await MeetingNudge.find({
    meetingId,
    nudgeType: "GENERAL_PREP",
  }).populate("recipientId", "name email");
  if (!nudges.length) return null;

  const totalScore = nudges.reduce(
    (sum, n) => sum + (n.readinessScore || 0),
    0,
  );
  const averageScore = Math.round(totalScore / nudges.length);

  return {
    averageScore,
    participants: nudges.map((n) => ({
      user: n.recipientId,
      score: n.readinessScore,
      context: n.context,
    })),
  };
};
