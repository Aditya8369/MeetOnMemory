import eventBus from "./eventBus.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import { dispatchWebhookEvent } from "./webhookDispatcherService.js";
import { WEBHOOK_EVENT_NAMES } from "../config/webhookEvents.js";

/**
 * Registers the public EventBus events that are not already handled by
 * webhookDispatcherService.js.
 *
 * The three legacy events (meeting.created, mom.generated, policy.updated)
 * remain registered in the dispatcher itself. This module owns the expanded
 * catalog so there is a single public webhook contract without double delivery.
 */

let registered = false;

const toId = (value) => {
  if (!value) return null;
  return value?._id?.toString?.() || value?.toString?.() || String(value);
};

const getOrganizationId = (value) =>
  toId(value?.organization ?? value?.organizationId ?? value?.orgId);

const dispatch = async (event, organizationId, data) => {
  if (!organizationId) return;
  try {
    await dispatchWebhookEvent(organizationId, event, data);
  } catch (error) {
    console.error(
      `⚠️ Failed to dispatch webhook event "${event}":`,
      error?.message || error,
    );
  }
};

const register = (event, handler) => {
  eventBus.on(event, async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      console.error(
        `⚠️ Webhook event handler "${event}" failed:`,
        error?.message || error,
      );
    }
  });
};

export const registerExpandedWebhookEvents = () => {
  if (registered) return false;
  registered = true;

  const expandedEvents = new Set(WEBHOOK_EVENT_NAMES);

  if (expandedEvents.has("meeting.updated")) {
    register("meeting.updated", (meeting) => {
      const organizationId = getOrganizationId(meeting);
      if (!organizationId) return;

      return dispatch("meeting.updated", organizationId, {
        meetingId: toId(meeting?._id),
        title: meeting?.title,
        description: meeting?.description,
        date: meeting?.date,
        meetingType: meeting?.meetingType,
        status: meeting?.status,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("meeting.soft_deleted")) {
    register("meeting.soft_deleted", (meeting) => {
      const organizationId = getOrganizationId(meeting);
      if (!organizationId) return;

      return dispatch("meeting.soft_deleted", organizationId, {
        meetingId: toId(meeting?._id),
        title: meeting?.title,
        deletedAt: meeting?.deletedAt,
        deletedBy: toId(meeting?.deletedBy),
        deletionReason: meeting?.deletionReason || null,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("meeting.restored")) {
    register("meeting.restored", (meeting) => {
      const organizationId = getOrganizationId(meeting);
      if (!organizationId) return;

      return dispatch("meeting.restored", organizationId, {
        meetingId: toId(meeting?._id),
        title: meeting?.title,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("meeting.permanently_deleted")) {
    register("meeting.permanently_deleted", (meeting) => {
      const organizationId = getOrganizationId(meeting);
      if (!organizationId) return;

      return dispatch("meeting.permanently_deleted", organizationId, {
        meetingId: toId(meeting?._id),
        title: meeting?.title,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("meeting.ended")) {
    register("meeting.ended", async ({ meetingId } = {}) => {
      if (!meetingId) return;

      const meeting = await Meeting.findById(meetingId)
        .select("_id title date meetingType organization")
        .lean();
      const organizationId = getOrganizationId(meeting);
      if (!organizationId) return;

      return dispatch("meeting.ended", organizationId, {
        meetingId: toId(meeting?._id),
        title: meeting?.title,
        date: meeting?.date,
        meetingType: meeting?.meetingType,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("policy.created")) {
    register("policy.created", (policy) => {
      const organizationId = getOrganizationId(policy);
      if (!organizationId) return;

      return dispatch("policy.created", organizationId, {
        policyId: toId(policy?._id),
        name: policy?.name,
        version: policy?.version,
        summary: policy?.summary,
        key_changes: policy?.key_changes,
        keywords: policy?.keywords,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("actionItem.completed")) {
    register("actionItem.completed", (data = {}) => {
      const organizationId = getOrganizationId(data);
      if (!organizationId) return;

      return dispatch("actionItem.completed", organizationId, {
        actionItemId: toId(data?.actionItemId),
        userId: toId(data?.userId),
        organizationId,
      });
    });
  }

  if (expandedEvents.has("organization.joined")) {
    register("organization.joined", (data = {}) => {
      const organizationId = getOrganizationId(data);
      if (!organizationId) return;

      return dispatch("organization.joined", organizationId, {
        userId: toId(data?.userId),
        organizationId,
        organizationName: data?.organizationName,
        adminId: toId(data?.adminId),
      });
    });
  }

  if (expandedEvents.has("export.ready")) {
    register("export.ready", async (data = {}) => {
      if (!data.userId) return;

      const user = await User.findById(data.userId)
        .select("organization")
        .lean();
      const organizationId = getOrganizationId(user);
      if (!organizationId) return;

      return dispatch("export.ready", organizationId, {
        userId: toId(data?.userId),
        downloadUrl: data?.downloadUrl,
        organizationId,
      });
    });
  }

  if (expandedEvents.has("live_meeting.notified")) {
    register("live_meeting.notified", (data = {}) => {
      const organizationId = getOrganizationId(data);
      if (!organizationId) return;

      return dispatch("live_meeting.notified", organizationId, {
        uploaderId: toId(data?.uploaderId),
        roomId: data?.roomId,
        participantIds: Array.isArray(data?.participants)
          ? data.participants.map(toId).filter(Boolean)
          : [],
        organizationId,
      });
    });
  }

  if (expandedEvents.has("gamification.badgesUnlocked")) {
    register("gamification.badgesUnlocked", (data = {}) => {
      const organizationId = getOrganizationId(data);
      if (!organizationId) return;

      return dispatch("gamification.badgesUnlocked", organizationId, {
        userId: toId(data?.userId),
        badges: Array.isArray(data?.badges)
          ? data.badges.map((badge) => ({
              id: toId(badge?._id || badge?.id),
              name: badge?.name,
              description: badge?.description,
            }))
          : [],
        organizationId,
      });
    });
  }

  return true;
};

// The webhook controller is loaded during normal route registration, so this
// side effect makes the expanded listeners active in the application without
// requiring a second bootstrap path.
registerExpandedWebhookEvents();

export default registerExpandedWebhookEvents;
