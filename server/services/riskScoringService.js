/**
 * Computes the risk score by multiplying probability and impact.
 * Both should be values between 1 and 5.
 * @param {Number} probability (1-5)
 * @param {Number} impact (1-5)
 * @returns {Number} Score (1-25)
 */
exports.calculateRiskScore = (probability, impact) => {
  const p = Math.max(1, Math.min(5, Number(probability) || 3));
  const i = Math.max(1, Math.min(5, Number(impact) || 3));
  return p * i;
};

/**
 * Returns the categorical risk level based on the computed score.
 * @param {Number} score (1-25)
 * @returns {String} Level
 */
exports.getRiskLevel = (score) => {
  if (score >= 15) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
};
