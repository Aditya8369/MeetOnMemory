import MeetingSeries from "../models/meetingSeriesModel.js";
import Meeting from "../models/meetingModel.js";
import MeetingTopic from "../models/meetingTopicModel.js";
import ActionItem from "../models/actionItemModel.js";
import SentimentTimeline from "../models/sentimentTimelineModel.js";
import Decision from "../models/decisionModel.js";
import { generateSeriesRetrospectiveSummary } from "./GenerativeAIService.js";

export const getSeriesMeetings = async (seriesId, organizationId) => {
  return await Meeting.find({
    series: seriesId,
    organization: organizationId,
    deletedAt: null,
  })
    .sort({ seriesOccurrence: 1, date: 1 })
    .select("_id title date seriesOccurrence participants summary status")
    .lean();
};

export const getTopicRecurrence = async (meetingIds) => {
  const topics = await MeetingTopic.find({ meeting: { $in: meetingIds } })
    .populate("meeting", "date seriesOccurrence title")
    .lean();

  const recurrenceMap = new Map();

  topics.forEach((meetingTopicDoc) => {
    meetingTopicDoc.topics.forEach((topic) => {
      const topicName = topic.name.toLowerCase().trim();
      if (!recurrenceMap.has(topicName)) {
        recurrenceMap.set(topicName, {
          name: topic.name,
          occurrences: [],
          totalConfidence: 0,
          count: 0,
        });
      }

      const record = recurrenceMap.get(topicName);
      record.occurrences.push({
        meetingId: meetingTopicDoc.meeting._id,
        date: meetingTopicDoc.meeting.date,
        seriesOccurrence: meetingTopicDoc.meeting.seriesOccurrence,
        confidence: topic.confidence,
      });
      record.totalConfidence += topic.confidence || 0;
      record.count += 1;
    });
  });

  const result = Array.from(recurrenceMap.values())
    .map((r) => ({
      name: r.name,
      occurrences: r.occurrences,
      averageConfidence: r.count > 0 ? r.totalConfidence / r.count : 0,
      frequency: r.count,
    }))
    .sort((a, b) => b.frequency - a.frequency);

  return result;
};

export const getActionItemTrends = async (meetingIds) => {
  const actionItems = await ActionItem.find({
    sourceMeetingId: { $in: meetingIds },
  })
    .populate("sourceMeetingId", "date seriesOccurrence")
    .lean();

  const metrics = {
    total: actionItems.length,
    completed: 0,
    open: 0,
    overdue: 0,
    chronicCarryovers: [],
    trendByMeeting: {},
  };

  const now = new Date();

  // Track carryovers by text similarity or just count for now
  actionItems.forEach((ai) => {
    const isCompleted = ["resolved", "completed"].includes(ai.status);
    if (isCompleted) {
      metrics.completed++;
    } else {
      metrics.open++;
      if (ai.dueDate && new Date(ai.dueDate) < now) {
        metrics.overdue++;
      }
    }

    const meetingId = ai.sourceMeetingId._id.toString();
    if (!metrics.trendByMeeting[meetingId]) {
      metrics.trendByMeeting[meetingId] = {
        date: ai.sourceMeetingId.date,
        occurrence: ai.sourceMeetingId.seriesOccurrence,
        totalCreated: 0,
        completed: 0,
      };
    }

    metrics.trendByMeeting[meetingId].totalCreated++;
    if (isCompleted) {
      metrics.trendByMeeting[meetingId].completed++;
    }

    // Very naive chronic carryover logic: if it has many aliases/mergedFrom
    if (ai.mergedFrom && ai.mergedFrom.length > 2 && !isCompleted) {
      metrics.chronicCarryovers.push({
        id: ai._id,
        text: ai.text,
        owner: ai.owner,
        mergeCount: ai.mergedFrom.length,
        status: ai.status,
      });
    }
  });

  return {
    metrics,
    trend: Object.values(metrics.trendByMeeting).sort(
      (a, b) => a.occurrence - b.occurrence,
    ),
  };
};

export const getAttendanceConsistency = async (meetings) => {
  const participantStats = new Map();

  meetings.forEach((meeting) => {
    (meeting.participants || []).forEach((p) => {
      const emailOrName = p.email || p.name;
      if (!participantStats.has(emailOrName)) {
        participantStats.set(emailOrName, {
          name: p.name,
          email: p.email,
          attended: 0,
          attendanceHistory: [],
        });
      }

      const record = participantStats.get(emailOrName);
      record.attended++;
      record.attendanceHistory.push({
        meetingId: meeting._id,
        date: meeting.date,
        occurrence: meeting.seriesOccurrence,
        role: p.role,
      });
    });
  });

  const totalMeetings = meetings.length;
  return Array.from(participantStats.values())
    .map((p) => ({
      ...p,
      attendanceRate:
        totalMeetings > 0 ? (p.attended / totalMeetings) * 100 : 0,
    }))
    .sort((a, b) => b.attendanceRate - a.attendanceRate);
};

export const getSentimentTrends = async (meetingIds) => {
  const timelines = await SentimentTimeline.find({
    meeting: { $in: meetingIds },
  })
    .populate("meeting", "date seriesOccurrence")
    .lean();

  return timelines
    .map((t) => ({
      meetingId: t.meeting._id,
      date: t.meeting.date,
      occurrence: t.meeting.seriesOccurrence,
      overallArc: t.overallArc,
      averageScore:
        t.segments.length > 0
          ? t.segments.reduce((acc, seg) => acc + seg.score, 0) /
            t.segments.length
          : 0,
    }))
    .sort((a, b) => a.occurrence - b.occurrence);
};

export const getDecisionFollowThrough = async (meetingIds) => {
  const decisions = await Decision.find({
    sourceMeetingId: { $in: meetingIds },
  })
    .populate("sourceMeetingId", "date seriesOccurrence")
    .lean();

  const total = decisions.length;
  let resolved = 0;
  let open = 0;

  decisions.forEach((d) => {
    if (d.status === "resolved") resolved++;
    else open++;
  });

  return {
    total,
    resolved,
    open,
    followThroughRate: total > 0 ? (resolved / total) * 100 : 0,
    decisions: decisions.map((d) => ({
      id: d._id,
      text: d.text,
      status: d.status,
      owner: d.owner,
      date: d.sourceMeetingId?.date,
      occurrence: d.sourceMeetingId?.seriesOccurrence,
    })),
  };
};

export const getRetrospectiveOverview = async (seriesId, organizationId) => {
  const series = await MeetingSeries.findOne({
    _id: seriesId,
    organization: organizationId,
  }).lean();
  if (!series) throw new Error("Meeting series not found");

  const meetings = await getSeriesMeetings(seriesId, organizationId);
  const meetingIds = meetings.map((m) => m._id);

  if (meetingIds.length === 0) {
    return {
      summary: "No meetings found for this series yet.",
      metricsData: {
        totalMeetings: 0,
        topTopics: [],
        actionItemCompletionRate: 0,
        averageAttendance: 0,
        sentimentTrend: [],
        decisionFollowThroughRate: 0,
      },
      insufficientHistory: true,
    };
  }

  if (meetingIds.length < 2) {
    return {
      summary:
        "This series needs more meeting history for a useful retrospective. Hold at least two occurrences, then reopen this page.",
      metricsData: {
        totalMeetings: meetings.length,
        topTopics: [],
        actionItemCompletionRate: 0,
        averageAttendance: 0,
        sentimentTrend: [],
        decisionFollowThroughRate: 0,
      },
      insufficientHistory: true,
    };
  }

  const [
    topicRecurrence,
    actionItemTrends,
    attendanceConsistency,
    sentimentTrends,
    decisionFollowThrough,
  ] = await Promise.all([
    getTopicRecurrence(meetingIds),
    getActionItemTrends(meetingIds),
    getAttendanceConsistency(meetings),
    getSentimentTrends(meetingIds),
    getDecisionFollowThrough(meetingIds),
  ]);

  const metricsData = {
    totalMeetings: meetings.length,
    topTopics: topicRecurrence.slice(0, 5).map((t) => t.name),
    actionItemCompletionRate:
      actionItemTrends.metrics.total > 0
        ? (actionItemTrends.metrics.completed /
            actionItemTrends.metrics.total) *
          100
        : 0,
    averageAttendance:
      attendanceConsistency.reduce((acc, p) => acc + p.attendanceRate, 0) /
      (attendanceConsistency.length || 1),
    sentimentTrend: sentimentTrends.map((s) => s.averageScore),
    decisionFollowThroughRate: decisionFollowThrough.followThroughRate,
  };

  let summary = "";
  try {
    summary = await generateSeriesRetrospectiveSummary(
      series.title,
      metricsData,
    );
  } catch (error) {
    console.error("AI Summary generation failed, using fallback.", error);
    summary = "Could not generate AI summary at this time.";
  }

  return {
    summary,
    metricsData,
    insufficientHistory: false,
  };
};
