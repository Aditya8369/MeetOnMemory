export const AUTOMATION = Object.freeze({
  id: "meetonmemory",
  metadataStart: "<!-- mom:metadata:start -->",
  metadataEnd: "<!-- mom:metadata:end -->",
  prOpenedMarker: "<!-- automation:pr-opened -->",
  markerPrefix: "mom",
  expiredMarker: "mom:claim-expired",
  claimWelcomeMarker: "mom:claim-welcome",
  assignmentWelcomeMarker: "mom:manual-assignment-welcome",
  prChecklistMarker: "mom:pr-checklist",
  mergedMarker: "mom:pr-merged",
  firstWelcomeMarker: "mom:first-contributor-welcome",
  guidanceMarker: "mom:claim-guidance",
  overrideMarker: "mom:maintainer-override",
  ciValidationMarker: "mom:ci-validation",
  prAutoClosedMarker: "mom:pr-auto-closed",
  prChangesRequestedReminderMarker: "mom:pr-changes-requested-reminder",
  prFailedChecksReminderMarker: "mom:pr-failed-checks-reminder",
  authorPriorityExpiredMarker: "mom:author-priority-expired",
});

export const COMMANDS = Object.freeze({
  claim: "/claim",
  unclaim: "/unclaim",
});

export const LIMITS = Object.freeze({
  maxActiveAssignedIssues: 5,
  guidanceCooldownHours: 12,
});

export const TIMERS = Object.freeze({
  // Reminders every 6 hours until the 24-hour claim window expires.
  reminderHours: Object.freeze([6, 12, 18]),
  expirationHours: 24,
  // Contributor-authored issues: exclusive claim window for the author.
  authorPriorityHours: 24,
  // Close open PRs strictly after this many hours (uses PR created_at).
  prAutoCloseHours: 48,
});

export function reminderMarker(hours) {
  return `mom:reminder-${hours}h`;
}

export const IGNORE_BOTS = Object.freeze([
  "github-actions[bot]",
  "dependabot[bot]",
  "renovate[bot]",
]);

export const MAINTAINER_ASSOCIATIONS = Object.freeze([
  "OWNER",
  "MEMBER",
  "COLLABORATOR",
]);

export const ISSUE_EVENTS = Object.freeze({
  assigned: "assigned",
  unassigned: "unassigned",
  reopened: "reopened",
  closed: "closed",
  transferred: "transferred",
});

export const PR_EVENTS = Object.freeze({
  opened: "opened",
  edited: "edited",
  synchronize: "synchronize",
  reopened: "reopened",
  readyForReview: "ready_for_review",
  closed: "closed",
});

export const EXPECTED_REPOSITORY =
  process.env.AUTOMATION_REPOSITORY || process.env.GITHUB_REPOSITORY || "";

export const ALLOWED_BRANCH_PREFIXES = Object.freeze([
  "feature",
  "fix",
  "docs",
  "chore",
  "refactor",
]);

export const REQUIRED_CHECK_NAMES = Object.freeze([
  "Code Quality",
  "Backend Validation",
  "Frontend Validation",
  "Integration Tests",
]);
