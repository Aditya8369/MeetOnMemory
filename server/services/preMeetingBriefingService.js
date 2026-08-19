// server/services/preMeetingBriefingService.js
/**
 * Pre-meeting Briefing Service
 *
 * Business logic layer for generating and retrieving pre-meeting briefing packages.
 */

/**
 * Generate pre-meeting briefing content for a given meeting document.
 *
 * @param {Object} meeting
 * @returns {Object} Briefing package
 */
export const generatePreMeetingBriefing = async (meeting) => {
  if (!meeting) {
    throw new Error("Meeting object is required to generate briefing.");
  }

  const participants = meeting.participants || [];
  const agendaItems = meeting.agendaItems || [];
  const title = meeting.title || "Upcoming Meeting";
  const date = meeting.date;

  const briefing = {
    meetingId: meeting._id?.toString() || "",
    title,
    date,
    attendees: participants.map((p) => ({
      name: p.name,
      email: p.email || "",
      role: p.role || "Participant",
    })),
    agendaSummary: agendaItems.map((item) => item.text || item.title || item),
    previousContext: meeting.summary || "No previous meeting notes recorded.",
    keyActionItems: [
      "Review meeting agenda prior to call",
      "Confirm participant roles and open action items",
    ],
    generatedAt: new Date(),
  };

  return briefing;
};

/**
 * Retrieve pre-meeting briefing for a given meeting.
 *
 * @param {Object} meeting
 * @returns {Object} Briefing package
 */
export const getPreMeetingBriefing = async (meeting) => {
  return generatePreMeetingBriefing(meeting);
};
