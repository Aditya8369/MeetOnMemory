/**
 * @desc Calculates engagement and efficiency scores based on transcript
 * analytics and meeting outcomes. Uses participation balance (Gini coefficient)
 * and action item density as key metrics.
 */
class EngagementScorer {
  /**
   * Calculates the Gini coefficient to measure participation inequality.
   * 0 = perfect equality (everyone spoke equally), 1 = total inequality (one person spoke 100%).
   * @param {Array} distribution - Array of { percentage } objects.
   * @returns {number} Gini coefficient (0-1).
   */
  static calculateGini(distribution) {
    if (distribution.length === 0) return 0;

    const values = distribution.map((d) => d.percentage).sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);

    if (sum === 0) return 0;

    let weightedSum = 0;

    for (let i = 0; i < n; i++) {
      weightedSum += (i + 1) * values[i];
    }

    const gini = (2 * weightedSum) / (n * sum) - (n + 1) / n;
    return Math.max(0, Math.min(1, gini)); // Clamp between 0 and 1
  }

  /**
   * Calculates overall engagement score (0-100).
   * @param {Object} analytics - Output from TranscriptAnalyzer.
   * @param {number} actionItemCount - Number of action items generated.
   * @returns {number} Score 0-100.
   */
  static calculateEngagementScore(analytics, actionItemCount = 0) {
    let score = 50; // Base score

    // Empty transcripts shouldn't get balance points
    let balanceScore = 0;
    if (analytics.distribution && analytics.distribution.length > 0) {
      const gini = this.calculateGini(analytics.distribution);
      balanceScore = (1 - gini) * 30;
    }
    score += balanceScore;

    const totalQuestions = analytics.distribution.reduce(
      (sum, d) => sum + d.questionsAsked,
      0,
    );
    score += Math.min(20, (totalQuestions / 10) * 20);
    score += Math.min(20, (actionItemCount / 5) * 20);

    const silencePenalty = Math.min(30, analytics.silencePeriods * 5);
    score -= silencePenalty;

    if (analytics.overlapRatio > 5 && analytics.overlapRatio < 20) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculates efficiency score (0-100) based on action items per minute.
   */
  static calculateEfficiencyScore(durationMinutes, actionItemCount) {
    if (durationMinutes === 0) return 0;
    const density = actionItemCount / durationMinutes;
    return Math.round(Math.min(100, density * 5 * 100));
  }
}

module.exports = EngagementScorer;
