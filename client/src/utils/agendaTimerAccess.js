/**
 * Mirrors server/controllers/agendaTimerController.js `canManageTimers`.
 * Mutation stays limited to the meeting uploader or a same-org admin/owner.
 */
export const canManageAgendaTimer = (meeting, user) => {
  if (!meeting || !user) return false;

  const userId = (user._id ?? user.id)?.toString();
  if (!userId) return false;

  const uploadedBy = meeting.uploadedBy?._id || meeting.uploadedBy;
  const isUploader = uploadedBy?.toString() === userId;

  const meetingOrg = meeting.organization?._id || meeting.organization;
  const userOrg = user.organization?._id || user.organization;
  const sameOrg = Boolean(
    meetingOrg && userOrg && meetingOrg.toString() === userOrg.toString(),
  );
  const isOrgAdmin =
    sameOrg && (user.role === "admin" || user.role === "owner");

  return Boolean(isUploader || isOrgAdmin);
};
