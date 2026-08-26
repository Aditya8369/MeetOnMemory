/**
 * Group notification list for the Notifications page (Issue #2064).
 *
 * @param {Array<object>} notifications
 * @param {"none"|"day"|"meeting"|"type"} groupBy
 * @returns {Array<{ key: string, label: string, items: object[] }>}
 */
export function groupNotifications(notifications, groupBy = "day") {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "All notifications",
        items: notifications,
      },
    ];
  }

  const groups = new Map();

  for (const notification of notifications) {
    const { key, label } = resolveGroup(notification, groupBy);
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] });
    }
    groups.get(key).items.push(notification);
  }

  return Array.from(groups.values());
}

function resolveGroup(notification, groupBy) {
  if (groupBy === "type") {
    const category = notification.category || "system";
    return {
      key: `type:${category}`,
      label: category,
    };
  }

  if (groupBy === "meeting") {
    const meetingId =
      notification.metadata?.meetingId ||
      notification.metadata?.meeting ||
      null;
    if (meetingId) {
      return {
        key: `meeting:${String(meetingId)}`,
        label: notification.metadata?.meetingTitle
          ? String(notification.metadata.meetingTitle)
          : `Meeting ${String(meetingId).slice(-6)}`,
      };
    }
    return { key: "meeting:none", label: "No meeting" };
  }

  // day (default)
  const created = notification.createdAt
    ? new Date(notification.createdAt)
    : new Date();
  const dayKey = Number.isNaN(created.getTime())
    ? "unknown"
    : created.toISOString().slice(0, 10);
  const label =
    dayKey === "unknown"
      ? "Unknown date"
      : created.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  return { key: `day:${dayKey}`, label };
}

export function notificationId(notification) {
  return String(notification?.id || notification?._id || "");
}
