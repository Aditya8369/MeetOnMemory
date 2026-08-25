/**
 * Public webhook event catalog.
 *
 * Keep this list limited to domain events that are intentionally exposed to
 * external webhook consumers. Internal Socket.IO/notification events are not
 * part of the public webhook contract.
 */
export const WEBHOOK_EVENTS = Object.freeze([
  {
    id: "meeting.created",
    label: "Meeting Created",
    description: "Fired when a meeting is created.",
  },
  {
    id: "meeting.updated",
    label: "Meeting Updated",
    description: "Fired when meeting details or processing state changes.",
  },
  {
    id: "meeting.soft_deleted",
    label: "Meeting Soft Deleted",
    description: "Fired when a meeting is moved to the recycle bin.",
  },
  {
    id: "meeting.restored",
    label: "Meeting Restored",
    description: "Fired when a deleted meeting is restored.",
  },
  {
    id: "meeting.permanently_deleted",
    label: "Meeting Permanently Deleted",
    description: "Fired when a meeting is permanently removed.",
  },
  {
    id: "meeting.ended",
    label: "Meeting Ended",
    description: "Fired when all agenda items are completed or skipped.",
  },
  {
    id: "mom.generated",
    label: "Minutes of Meeting Ready",
    description: "Fired when AI finishes generating structured MoM.",
  },
  {
    id: "policy.created",
    label: "Policy Created",
    description: "Fired when a new organization policy is uploaded.",
  },
  {
    id: "policy.updated",
    label: "Policy Updated",
    description: "Fired when a policy is modified or re-analyzed.",
  },
  {
    id: "actionItem.completed",
    label: "Action Item Completed",
    description: "Fired when an action item is completed or resolved.",
  },
  {
    id: "organization.joined",
    label: "Organization Member Joined",
    description: "Fired when a user joins an organization.",
  },
  {
    id: "export.ready",
    label: "Data Export Ready",
    description: "Fired when a requested data export is ready for download.",
  },
  {
    id: "live_meeting.notified",
    label: "Live Meeting Invitation",
    description: "Fired when participants are invited to a live meeting.",
  },
  {
    id: "gamification.badgesUnlocked",
    label: "Badges Unlocked",
    description: "Fired when a user unlocks one or more badges.",
  },
]);

export const WEBHOOK_EVENT_NAMES = Object.freeze(
  WEBHOOK_EVENTS.map(({ id }) => id),
);

export const isSupportedWebhookEvent = (event) =>
  typeof event === "string" && WEBHOOK_EVENT_NAMES.includes(event);
