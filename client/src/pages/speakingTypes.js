/**
 * Data models and constants for the Speaking Time Analytics Dashboard.
 */

export const SpeakingRole = {
  FACILITATOR: 'facilitator',
  PRESENTER: 'presenter',
  PARTICIPANT: 'participant',
  OBSERVER: 'observer',
};

export const BalanceRating = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  BIASED: 'biased',
  DOMINATED: 'dominated',
};

export const TrendDirection = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining',
};

export const TimeRange = {
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
};

export const BALANCE_CONFIG = {
  [BalanceRating.EXCELLENT]: { label: 'Excellent Balance', color: '#22c55e', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400', description: 'Speaking time is well distributed among all participants', minScore: 85 },
  [BalanceRating.GOOD]: { label: 'Good Balance', color: '#0ea5e9', bgColor: 'bg-sky-50 dark:bg-sky-900/30', textColor: 'text-sky-600 dark:text-sky-400', description: 'Most participants contribute meaningfully', minScore: 70 },
  [BalanceRating.BIASED]: { label: 'Biased', color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', description: 'A few speakers dominate the conversation', minScore: 45 },
  [BalanceRating.DOMINATED]: { label: 'Dominated', color: '#ef4444', bgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400', description: 'One or two speakers control most of the time', minScore: 0 },
};

export const ROLE_CONFIG = {
  [SpeakingRole.FACILITATOR]: { label: 'Facilitator', color: '#8b5cf6', icon: 'Crown' },
  [SpeakingRole.PRESENTER]: { label: 'Presenter', color: '#0ea5e9', icon: 'Mic' },
  [SpeakingRole.PARTICIPANT]: { label: 'Participant', color: '#22c55e', icon: 'User' },
  [SpeakingRole.OBSERVER]: { label: 'Observer', color: '#6b7280', icon: 'Eye' },
};

export const MOCK_MEMBERS = [
  { id: 'm1', name: 'Sarah Chen', role: SpeakingRole.FACILITATOR, department: 'Product', avatar: 'SC' },
  { id: 'm2', name: 'James Wilson', role: SpeakingRole.PRESENTER, department: 'Engineering', avatar: 'JW' },
  { id: 'm3', name: 'Priya Sharma', role: SpeakingRole.PARTICIPANT, department: 'Design', avatar: 'PS' },
  { id: 'm4', name: 'Alex Rivera', role: SpeakingRole.PARTICIPANT, department: 'Engineering', avatar: 'AR' },
  { id: 'm5', name: 'Emma Thompson', role: SpeakingRole.PARTICIPANT, department: 'Engineering', avatar: 'ET' },
  { id: 'm6', name: 'David Kim', role: SpeakingRole.PARTICIPANT, department: 'Engineering', avatar: 'DK' },
  { id: 'm7', name: 'Lisa Park', role: SpeakingRole.PARTICIPANT, department: 'Operations', avatar: 'LP' },
  { id: 'm8', name: 'Marcus Johnson', role: SpeakingRole.PARTICIPANT, department: 'Engineering', avatar: 'MJ' },
  { id: 'm9', name: 'Rachel Green', role: SpeakingRole.PARTICIPANT, department: 'Marketing', avatar: 'RG' },
  { id: 'm10', name: 'Tom Harris', role: SpeakingRole.OBSERVER, department: 'Sales', avatar: 'TH' },
];

export const MOCK_MEETING_TYPES = [
  'Standup', 'Sprint Planning', 'Retrospective', 'Design Review',
  'Architecture Review', '1-on-1', 'All Hands', 'Brainstorm',
  'Client Sync', 'Technical Deep Dive',
];
