/**
 * Data models and constants for the Meeting Health Dashboard.
 */

export const HealthMetric = {
  ATTENDANCE: 'attendance',
  PUNCTUALITY: 'punctuality',
  PREPARATION: 'preparation',
  DURATION: 'duration',
  FOLLOW_UP: 'follow_up',
  ENGAGEMENT: 'engagement',
  AGENDA: 'agenda',
  DECISIONS: 'decisions',
};

export const HealthStatus = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  CRITICAL: 'critical',
};

export const TrendDirection = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining',
};

export const IssueSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

export const STATUS_CONFIG = {
  [HealthStatus.EXCELLENT]: { label: 'Excellent', color: '#22c55e', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400', minScore: 85, emoji: '🟢' },
  [HealthStatus.GOOD]: { label: 'Good', color: '#0ea5e9', bgColor: 'bg-sky-50 dark:bg-sky-900/30', textColor: 'text-sky-600 dark:text-sky-400', minScore: 70, emoji: '🔵' },
  [HealthStatus.FAIR]: { label: 'Fair', color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', minScore: 50, emoji: '🟡' },
  [HealthStatus.POOR]: { label: 'Poor', color: '#f97316', bgColor: 'bg-orange-50 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400', minScore: 30, emoji: '🟠' },
  [HealthStatus.CRITICAL]: { label: 'Critical', color: '#ef4444', bgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400', minScore: 0, emoji: '🔴' },
};

export const METRIC_CONFIG = {
  [HealthMetric.ATTENDANCE]: { label: 'Attendance Rate', icon: 'Users', target: 85, unit: '%', description: 'Average meeting attendance across all sessions' },
  [HealthMetric.PUNCTUALITY]: { label: 'On-Time Start', icon: 'Clock', target: 90, unit: '%', description: 'Percentage of meetings starting within 5 minutes of scheduled time' },
  [HealthMetric.PREPARATION]: { label: 'Agenda Prepared', icon: 'FileText', target: 80, unit: '%', description: 'Meetings with a published agenda at least 1 hour before' },
  [HealthMetric.DURATION]: { label: 'Duration Adherence', icon: 'Timer', target: 75, unit: '%', description: 'Meetings ending within 10% of scheduled duration' },
  [HealthMetric.FOLLOW_UP]: { label: 'Follow-up Rate', icon: 'ArrowRight', target: 90, unit: '%', description: 'Meetings with documented follow-up actions' },
  [HealthMetric.ENGAGEMENT]: { label: 'Engagement Score', icon: 'MessageSquare', target: 75, unit: '/100', description: 'Average participant engagement across all meetings' },
  [HealthMetric.AGENDA]: { label: 'Agenda Coverage', icon: 'CheckCircle', target: 80, unit: '%', description: 'Percentage of agenda items addressed during the meeting' },
  [HealthMetric.DECISIONS]: { label: 'Decision Clarity', icon: 'Target', target: 85, unit: '%', description: 'Meetings with clearly documented decisions' },
};

export const SEVERITY_CONFIG = {
  [IssueSeverity.INFO]: { label: 'Info', color: '#0ea5e9', bgColor: 'bg-sky-50 dark:bg-sky-900/30', textColor: 'text-sky-600 dark:text-sky-400', icon: 'Info' },
  [IssueSeverity.WARNING]: { label: 'Warning', color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', icon: 'AlertTriangle' },
  [IssueSeverity.ERROR]: { label: 'Error', color: '#f97316', bgColor: 'bg-orange-50 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400', icon: 'AlertCircle' },
  [IssueSeverity.CRITICAL]: { label: 'Critical', color: '#ef4444', bgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400', icon: 'AlertOctagon' },
};

export const MOCK_TEAMS = [
  'Engineering', 'Product', 'Design', 'Marketing',
  'Sales', 'Operations', 'HR', 'Finance',
];

export const MOCK_MEETING_TYPES = [
  'Standup', 'Sprint Planning', 'Retrospective', 'Design Review',
  'Architecture Review', '1-on-1', 'All Hands', 'Brainstorm',
  'Client Sync', 'Technical Deep Dive',
];
