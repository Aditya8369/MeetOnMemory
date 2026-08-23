# Memory Lifecycle

## Bulk lifecycle transitions

The Memory Lifecycle page supports selecting multiple memories from the current
result page and applying a single lifecycle transition to them.

Supported bulk targets:

- Active
- Dormant
- Archived
- Expired

The client sends selections in chunks of 25 to keep requests bounded. The
server accepts at most 200 memories per request, validates every ID and memory
type, and scopes every lookup to the authenticated organization.

Each transition is persisted through the existing lifecycle service, so
`lifecycleHistory` remains the audit source of truth.

## Organization retention policy

Administrators with the existing `knowledge.manage_lifecycle` permission can
read and update organization-specific lifecycle thresholds.

The effective policy contains:

| Setting               |  Default |
| --------------------- | -------: |
| Dormant after         |  30 days |
| Archive after         |  90 days |
| Expire after          | 365 days |
| Importance protection |       70 |
| Hard delete expired   |    false |

Overrides are stored under the existing organization `metadata` document as
`memoryLifecyclePolicy`; this avoids a schema migration while preserving
organization-level persistence.

The thresholds must remain ordered:

```text
dormantAfterDays < archivedAfterDays < expiredAfterDays
```

Hard deletion remains opt-in. The default sweep only transitions memories; it
does not permanently delete expired records.

## Sweep integration

Lifecycle sweeps automatically read the organization's stored policy when an
organization is supplied. Existing environment variables remain the global
fallback when no organization override exists.

## Security

Bulk transitions and retention-policy changes use the existing
`knowledge.manage_lifecycle` RBAC permission and authenticated organization
membership. Memory IDs are validated before querying, and database lookups are
organization-scoped.
