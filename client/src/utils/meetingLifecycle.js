/**
 * Whether a meeting has finished, matching MeetingInviteService:
 * `status === "completed"` or the scheduled window (date + duration) has passed.
 */
export const isMeetingEnded = (meeting, now = Date.now()) => {
  if (!meeting) return false;
  if (meeting.status === "completed") return true;

  const meetingStart = meeting.date ? new Date(meeting.date).getTime() : NaN;
  if (Number.isNaN(meetingStart)) return false;

  const durationMs = (meeting.duration || 60) * 60 * 1000;
  return now > meetingStart + durationMs;
};
