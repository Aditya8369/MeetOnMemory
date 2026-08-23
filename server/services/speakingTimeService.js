import Transcript from "../models/transcriptModel.js";
import Meeting from "../models/meetingModel.js";

/**
 * Parses transcript data to compute speaking metrics per participant
 * @param {String} meetingId - The ID of the meeting
 * @returns {Object} Speaking metrics breakdown
 */
export const getBreakdownForMeeting = async (meetingId) => {
  const transcript = await Transcript.findOne({ meeting: meetingId }).lean();
  if (!transcript || !transcript.segments || transcript.segments.length === 0) {
    return {
      totalDuration: 0,
      participants: [],
    };
  }

  // Sort segments by start time
  const segments = [...transcript.segments].sort(
    (a, b) => a.startTime - b.startTime,
  );

  const statsMap = new Map();
  let meetingSpan = 0;
  let previousSegmentEnd = 0;
  let previousSpeakerIdentifier = null;

  // Determine overall start and end to calculate true meeting duration
  const meetingStart = segments[0].startTime;
  const meetingEnd = Math.max(...segments.map((s) => s.endTime));
  meetingSpan = meetingEnd - meetingStart;

  segments.forEach((segment) => {
    const { speaker, speakerId, startTime, endTime } = segment;
    const duration = endTime - startTime;

    if (duration <= 0) return;

    // Use speakerId if available, fallback to speaker name
    const identifier = speakerId || speaker || "Unknown";

    if (!statsMap.has(identifier)) {
      statsMap.set(identifier, {
        identifier,
        speakerName: speaker || "Unknown",
        totalDuration: 0,
        utteranceCount: 0,
        longestUtterance: 0,
        overlapCount: 0,
      });
    }

    const stats = statsMap.get(identifier);
    stats.totalDuration += duration;
    stats.utteranceCount += 1;
    if (duration > stats.longestUtterance) {
      stats.longestUtterance = duration;
    }

    // Check for overlap (proxy for interruption)
    // If this segment starts before the previous one ends, and it's a different speaker
    if (
      startTime < previousSegmentEnd &&
      previousSpeakerIdentifier !== identifier
    ) {
      stats.overlapCount += 1;
    }

    if (endTime > previousSegmentEnd) {
      previousSegmentEnd = endTime;
    }
    previousSpeakerIdentifier = identifier;
  });

  let aggregateSpeakingDuration = 0;
  const participants = Array.from(statsMap.values()).map((stats) => {
    aggregateSpeakingDuration += stats.totalDuration;
    return {
      ...stats,
      avgUtteranceLength: stats.totalDuration / stats.utteranceCount,
      talkRatio:
        meetingSpan > 0 ? (stats.totalDuration / meetingSpan) * 100 : 0,
    };
  });

  return {
    meetingSpan,
    totalDuration: aggregateSpeakingDuration,
    participants,
  };
};

/**
 * Aggregates a user's speaking stats across their last N meetings
 * @param {String} userId - The user's ID
 * @param {Number} limit - Number of past meetings to analyze
 * @returns {Array} List of meeting speaking stats for the user
 */
export const getTrendsForUser = async (userId, limit = 10) => {
  // Find meetings where user is a participant
  const meetings = await Meeting.find({ "participants.user": userId })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const trends = [];

  for (const meeting of meetings) {
    const breakdown = await getBreakdownForMeeting(meeting._id);

    // Resolve user's name in this meeting for fallback matching
    const participantRecord = meeting.participants.find(
      (p) => p.user && p.user.toString() === userId.toString(),
    );
    const userName = participantRecord ? participantRecord.name : null;

    // Find this user's stats in the breakdown
    // Match by speakerId (if available) or by resolved speakerName
    const userStats = breakdown.participants.find(
      (p) =>
        p.identifier === userId.toString() ||
        (userName && p.speakerName === userName),
    );

    if (userStats) {
      trends.push({
        meetingId: meeting._id,
        meetingTitle: meeting.title,
        date: meeting.date || meeting.createdAt,
        totalDuration: userStats.totalDuration,
        talkRatio: userStats.talkRatio,
        utteranceCount: userStats.utteranceCount,
        overlapCount: userStats.overlapCount,
      });
    } else {
      // User attended but didn't speak or couldn't be matched
      trends.push({
        meetingId: meeting._id,
        meetingTitle: meeting.title,
        date: meeting.date || meeting.createdAt,
        totalDuration: 0,
        talkRatio: 0,
        utteranceCount: 0,
        overlapCount: 0,
      });
    }
  }

  // Sort by date ascending for charts
  return trends.sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Aggregates speaking time comparison statistics for all members of an organization
 * @param {String} orgId - The organization's ID
 * @param {String} startDate - Optional start date filter
 * @param {String} endDate - Optional end date filter
 * @returns {Promise<Object>} The aggregated metrics
 */
export const getOrgSpeakingTimeStats = async (orgId, startDate, endDate) => {
  const query = { organization: orgId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const meetings = await Meeting.find(query).select("_id title date").lean();

  if (meetings.length === 0) {
    return {
      avgTalkRatio: 0,
      medianTalkRatio: 0,
      topSpeakers: [],
      meetingCount: 0,
      memberStats: [],
    };
  }

  const meetingIds = meetings.map((m) => m._id);
  const transcripts = await Transcript.find({
    meeting: { $in: meetingIds },
  }).lean();

  const totalTranscriptsCount = transcripts.length;
  if (totalTranscriptsCount === 0) {
    return {
      avgTalkRatio: 0,
      medianTalkRatio: 0,
      topSpeakers: [],
      meetingCount: 0,
      memberStats: [],
    };
  }

  const memberStatsMap = new Map();
  const allTalkRatios = [];

  for (const transcript of transcripts) {
    const segments = transcript.segments || [];
    if (segments.length === 0) continue;

    const sortedSegments = [...segments].sort(
      (a, b) => a.startTime - b.startTime,
    );

    const meetingStart = sortedSegments[0].startTime;
    const meetingEnd = Math.max(...sortedSegments.map((s) => s.endTime));
    const meetingSpan = meetingEnd - meetingStart;

    const speakerDurations = {};
    const speakerNames = {};

    sortedSegments.forEach((segment) => {
      const { speaker, speakerId, startTime, endTime } = segment;
      const duration = endTime - startTime;
      if (duration <= 0) return;

      const identifier = speakerId || speaker || "Unknown";
      speakerDurations[identifier] =
        (speakerDurations[identifier] || 0) + duration;
      speakerNames[identifier] = speaker || "Unknown";
    });

    Object.keys(speakerDurations).forEach((identifier) => {
      const duration = speakerDurations[identifier];
      const speakerName = speakerNames[identifier];
      const talkRatio = meetingSpan > 0 ? (duration / meetingSpan) * 100 : 0;

      allTalkRatios.push(talkRatio);

      if (!memberStatsMap.has(identifier)) {
        memberStatsMap.set(identifier, {
          identifier,
          speakerName,
          totalDuration: 0,
          meetingCount: 0,
          talkRatios: [],
        });
      }

      const stats = memberStatsMap.get(identifier);
      stats.totalDuration += duration;
      stats.meetingCount += 1;
      stats.talkRatios.push(talkRatio);
    });
  }

  const memberStats = Array.from(memberStatsMap.values()).map((stats) => {
    const averageTalkRatio =
      stats.talkRatios.reduce((sum, val) => sum + val, 0) /
      stats.talkRatios.length;
    return {
      identifier: stats.identifier,
      speakerName: stats.speakerName,
      totalDuration: stats.totalDuration,
      meetingCount: stats.meetingCount,
      averageTalkRatio,
    };
  });

  const avgTalkRatio =
    allTalkRatios.length > 0
      ? allTalkRatios.reduce((sum, val) => sum + val, 0) / allTalkRatios.length
      : 0;

  let medianTalkRatio = 0;
  if (allTalkRatios.length > 0) {
    const sorted = [...allTalkRatios].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianTalkRatio =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const topSpeakers = [...memberStats]
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 5);

  return {
    avgTalkRatio,
    medianTalkRatio,
    topSpeakers,
    meetingCount: totalTranscriptsCount,
    memberStats,
  };
};

export default {
  getBreakdownForMeeting,
  getTrendsForUser,
  getOrgSpeakingTimeStats,
};
