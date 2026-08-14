/**
 * @desc Service for intelligently resolving mentioned names in transcripts
 * to actual User IDs in the database. Uses fuzzy matching and historical
 * assignment patterns to suggest the correct assignee.
 */
class SmartAssignment {
  /**
   * Resolves a mentioned name to a User ID from the participant list.
   * @param {string} mentionedName - The name extracted by the AI (e.g., "John", "Sarah from Marketing").
   * @param {Array} participants - The official list of meeting participants.
   * @returns {Promise<string|null>} The User ID or null if ambiguous/not found.
   */
  static async resolveAssignee(mentionedName, participants) {
    if (
      !mentionedName ||
      mentionedName.trim() === "" ||
      mentionedName.toLowerCase() === "null"
    ) {
      return null;
    }

    const cleanName = mentionedName.toLowerCase().trim();

    // 1. Exact Match (First or Last Name)
    const exactMatch = participants.find((p) => {
      const fullName = p.name.toLowerCase();
      const [firstName, lastName] = fullName.split(" ");
      return (
        cleanName === fullName ||
        cleanName === firstName ||
        cleanName === lastName
      );
    });

    if (exactMatch) return exactMatch.id || exactMatch._id;

    // 2. Fuzzy Match (Levenshtein distance or includes)
    const fuzzyMatches = participants.filter((p) => {
      const fullName = p.name.toLowerCase();
      return fullName.includes(cleanName) || cleanName.includes(fullName);
    });

    // If exactly one fuzzy match, use it
    if (fuzzyMatches.length === 1) {
      return fuzzyMatches[0].id || fuzzyMatches[0]._id;
    }

    // 3. If multiple matches or no matches, return null (requires manual assignment)
    // In a more advanced system, we could check historical data:
    // "Who usually gets assigned tasks when 'John' is mentioned in this club?"
    return null;
  }

  /**
   * Suggests an assignee based on historical action item assignments for a specific club/team.
   * @param {string} teamId - The club or team ID.
   * @param {string} taskKeyword - Keywords from the task title to match against past tasks.
   * @returns {Promise<string|null>} Suggested User ID.
   */
  static async suggestBasedOnHistory(_teamId, _taskKeyword) {
    // This would query the ActionItem collection to find who most frequently
    // completes tasks containing similar keywords in this team.
    // For now, return null to force manual selection.
    return null;
  }
}

export default SmartAssignment;
