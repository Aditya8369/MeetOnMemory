/**
 * @desc Parses meeting transcripts to extract speaking time distribution,
 * interruption counts, and silence periods. Assumes transcript format includes
 * speaker labels and timestamps (e.g., WebVTT or custom JSON format).
 */
class TranscriptAnalyzer {
  /**
   * Analyzes a transcript and returns speaking metrics per participant.
   * @param {Array} transcriptSegments - Array of { speaker, start, end, text }
   * @returns {Object} Aggregated speaking metrics.
   */
  static analyze(transcriptSegments) {
    if (!transcriptSegments || transcriptSegments.length === 0) {
      return {
        distribution: [],
        totalSpeakingTime: 0,
        silencePeriods: 0,
        overlapRatio: 0,
      };
    }

    const speakerStats = {};
    let totalSpeakingTime = 0;
    let silencePeriods = 0;
    let overlapTime = 0;

    // Sort by start time
    const sorted = [...transcriptSegments].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length; i++) {
      const segment = sorted[i];
      const speaker = segment.speaker || "Unknown";
      const duration = (segment.end - segment.start) / 1000; // Convert ms to seconds

      if (!speakerStats[speaker]) {
        speakerStats[speaker] = {
          duration: 0,
          interruptions: 0,
          questionsAsked: 0,
        };
      }

      speakerStats[speaker].duration += duration;
      totalSpeakingTime += duration;

      // Count questions (simple heuristic: sentences ending with '?')
      const questions = (segment.text.match(/\?/g) || []).length;
      speakerStats[speaker].questionsAsked += questions;

      // Detect interruptions (overlap with previous segment)
      if (i > 0) {
        const prev = sorted[i - 1];
        if (segment.start < prev.end) {
          const overlap = (prev.end - segment.start) / 1000;
          overlapTime += overlap;
          speakerStats[speaker].interruptions += 1;
        }

        // Detect silence periods (> 10 seconds gap)
        const gap = (segment.start - prev.end) / 1000;
        if (gap > 10) {
          silencePeriods += 1;
        }
      }
    }

    // Calculate percentages
    const distribution = Object.entries(speakerStats).map(
      ([speaker, stats]) => ({
        userName: speaker,
        duration: Math.round(stats.duration),
        percentage:
          totalSpeakingTime > 0
            ? (stats.duration / totalSpeakingTime) * 100
            : 0,
        interruptions: stats.interruptions,
        questionsAsked: stats.questionsAsked,
      }),
    );

    const totalDuration =
      sorted.length > 0
        ? (sorted[sorted.length - 1].end - sorted[0].start) / 1000
        : 0;

    return {
      distribution,
      totalSpeakingTime: Math.round(totalSpeakingTime),
      totalDuration: Math.round(totalDuration),
      silencePeriods,
      overlapRatio: totalDuration > 0 ? (overlapTime / totalDuration) * 100 : 0,
    };
  }
}

module.exports = TranscriptAnalyzer;
