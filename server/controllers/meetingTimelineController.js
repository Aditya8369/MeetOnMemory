import Transcript from "../models/transcriptModel.js";
import KeyMoment from "../models/keyMomentModel.js";
import SentimentTimeline from "../models/sentimentTimelineModel.js";
import ActionItem from "../models/actionItemModel.js";
import TranscriptAnnotation from "../models/transcriptAnnotationModel.js";

/**
 * @route GET /api/timeline/:id/timeline
 * @desc Get an aggregated timeline of events for a meeting
 * @access Private
 */
export const getMeetingTimeline = async (req, res) => {
  try {
    const { id: meetingId } = req.params;

    const [
      transcript,
      keyMoments,
      sentimentTimeline,
      actionItems,
      annotations,
    ] = await Promise.all([
      Transcript.findOne({ meeting: meetingId }),
      KeyMoment.find({ meetingId }),
      SentimentTimeline.findOne({ meeting: meetingId }),
      ActionItem.find({ sourceMeetingId: meetingId }),
      TranscriptAnnotation.find({ meeting: meetingId }).populate(
        "author",
        "firstName lastName name",
      ),
    ]);

    const timelineEvents = [];

    // 1. Transcript segments (Speaker changes)
    if (transcript && transcript.segments) {
      let currentSpeaker = null;
      transcript.segments.forEach((segment) => {
        if (segment.speaker !== currentSpeaker) {
          timelineEvents.push({
            type: "speaker_change",
            startTime: segment.startTime,
            endTime: segment.endTime,
            data: {
              speaker: segment.speaker,
              text: segment.text,
            },
          });
          currentSpeaker = segment.speaker;
        }
      });
    }

    // 2. Key Moments
    if (keyMoments) {
      keyMoments.forEach((moment) => {
        timelineEvents.push({
          type: "key_moment",
          startTime: moment.startTime,
          endTime: moment.endTime,
          data: {
            category: moment.category,
            snippet: moment.snippet,
            note: moment.note,
          },
        });
      });
    }

    // 3. Sentiment Shifts
    if (sentimentTimeline && sentimentTimeline.segments) {
      sentimentTimeline.segments.forEach((segment) => {
        timelineEvents.push({
          type: "sentiment_shift",
          startTime: segment.startTime,
          endTime: segment.endTime,
          data: {
            sentiment: segment.sentiment,
            score: segment.score,
            textSnippet: segment.textSnippet,
          },
        });
      });
    }

    // 4. Annotations
    if (annotations) {
      annotations.forEach((annotation) => {
        timelineEvents.push({
          type: "annotation",
          startTime: annotation.startTime,
          endTime: annotation.endTime,
          data: {
            annotationType: annotation.type,
            body: annotation.body,
            color: annotation.color,
            authorName:
              annotation.author?.name ||
              `${annotation.author?.firstName || ""} ${annotation.author?.lastName || ""}`.trim() ||
              "Unknown",
          },
        });
      });
    }

    // 5. Action Items
    if (actionItems) {
      const maxTime = timelineEvents.reduce(
        (max, event) => Math.max(max, event.endTime || 0),
        0,
      );

      actionItems.forEach((item) => {
        timelineEvents.push({
          type: "action_item",
          startTime: maxTime,
          endTime: maxTime,
          data: {
            text: item.text,
            owner: item.owner,
            status: item.status,
            dueDate: item.dueDate,
          },
        });
      });
    }

    // Sort chronologically
    timelineEvents.sort((a, b) => a.startTime - b.startTime);

    return res.status(200).json({
      success: true,
      timeline: timelineEvents,
    });
  } catch (error) {
    console.error("Error fetching meeting timeline:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the timeline.",
      error: error.message,
    });
  }
};
