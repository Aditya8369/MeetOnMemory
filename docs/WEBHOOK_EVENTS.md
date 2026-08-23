# Webhook Events

MeetOnMemory webhooks use the authenticated organization webhook API:

- `POST /api/webhooks` — create a subscription
- `GET /api/webhooks?organizationId=<id>` — list subscriptions
- `PATCH /api/webhooks/:id` — update a subscription
- `DELETE /api/webhooks/:id` — delete a subscription

## Supported event catalog

| Event                         | Description                                               |
| ----------------------------- | --------------------------------------------------------- |
| `meeting.created`             | Fired when a meeting is created.                          |
| `meeting.updated`             | Fired when meeting details or processing state changes.   |
| `meeting.soft_deleted`        | Fired when a meeting is moved to the recycle bin.         |
| `meeting.restored`            | Fired when a deleted meeting is restored.                 |
| `meeting.permanently_deleted` | Fired when a meeting is permanently removed.              |
| `meeting.ended`               | Fired when all agenda items are completed or skipped.     |
| `mom.generated`               | Fired when AI finishes generating structured MoM.         |
| `policy.created`              | Fired when a new organization policy is uploaded.         |
| `policy.updated`              | Fired when a policy is modified or re-analyzed.           |
| `actionItem.completed`        | Fired when an action item is completed or resolved.       |
| `organization.joined`         | Fired when a user joins an organization.                  |
| `export.ready`                | Fired when a requested data export is ready for download. |
| `live_meeting.notified`       | Fired when participants are invited to a live meeting.    |
| `gamification.badgesUnlocked` | Fired when a user unlocks one or more badges.             |

Each delivery uses the existing signed webhook envelope:

```json
{
  "event": "meeting.updated",
  "timestamp": "2026-08-22T12:00:00.000Z",
  "data": {
    "meetingId": "66a4f912e8b23c0012345678",
    "title": "Weekly Sync",
    "organizationId": "66a4f912e8b23c0012345670"
  }
}
```

The existing HMAC-SHA256 signature is sent in:

`x-meetonmemory-signature`

and the signing timestamp is sent in:

`x-meetonmemory-request-timestamp`

## Notes

- Only events in the catalog above are accepted by the webhook registration/update API.
- Internal notification/socket events are deliberately not exposed as public webhook events.
- Existing `meeting.created`, `mom.generated`, and `policy.updated` dispatch behavior remains intact.
- The expanded event bridge maps the additional EventBus domain events to organization-scoped webhook deliveries.
