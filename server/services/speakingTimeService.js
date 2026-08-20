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

export default {
  getBreakdownForMeeting,
  getTrendsForUser,
};
