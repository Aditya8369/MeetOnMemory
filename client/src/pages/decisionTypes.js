/**
 * Data models and constants for the Decision Tracking Dashboard.
 */

export const DecisionStatus = {
  PROPOSED: 'proposed',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  IMPLEMENTED: 'implemented',
  REJECTED: 'rejected',
  REVISIT: 'revisit',
};

export const DecisionImpact = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const DecisionCategory = {
  ARCHITECTURE: 'architecture',
  PROCESS: 'process',
  TOOLING: 'tooling',
  HIRING: 'hiring',
  STRATEGY: 'strategy',
  BUDGET: 'budget',
  POLICY: 'policy',
  TECHNICAL: 'technical',
};

export const TrendDirection = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining',
};

export const STATUS_CONFIG = {
  [DecisionStatus.PROPOSED]: { label: 'Proposed', color: '#6b7280', bgColor: 'bg-gray-50 dark:bg-gray-800', textColor: 'text-gray-600 dark:text-gray-400', icon: 'Lightbulb' },
  [DecisionStatus.IN_REVIEW]: { label: 'In Review', color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', icon: 'Eye' },
  [DecisionStatus.APPROVED]: { label: 'Approved', color: '#0ea5e9', bgColor: 'bg-sky-50 dark:bg-sky-900/30', textColor: 'text-sky-600 dark:text-sky-400', icon: 'CheckCircle' },
  [DecisionStatus.IMPLEMENTED]: { label: 'Implemented', color: '#22c55e', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400', icon: 'Rocket' },
  [DecisionStatus.REJECTED]: { label: 'Rejected', color: '#ef4444', bgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400', icon: 'XCircle' },
  [DecisionStatus.REVISIT]: { label: 'Revisit', color: '#8b5cf6', bgColor: 'bg-violet-50 dark:bg-violet-900/30', textColor: 'text-violet-600 dark:text-violet-400', icon: 'RotateCcw' },
};

export const IMPACT_CONFIG = {
  [DecisionImpact.CRITICAL]: { label: 'Critical', color: '#ef4444', bgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400' },
  [DecisionImpact.HIGH]: { label: 'High', color: '#f97316', bgColor: 'bg-orange-50 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400' },
  [DecisionImpact.MEDIUM]: { label: 'Medium', color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400' },
  [DecisionImpact.LOW]: { label: 'Low', color: '#22c55e', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
};

export const CATEGORY_CONFIG = {
  [DecisionCategory.ARCHITECTURE]: { label: 'Architecture', color: '#8b5cf6', icon: 'Layers' },
  [DecisionCategory.PROCESS]: { label: 'Process', color: '#0ea5e9', icon: 'GitBranch' },
  [DecisionCategory.TOOLING]: { label: 'Tooling', color: '#22c55e', icon: 'Wrench' },
  [DecisionCategory.HIRING]: { label: 'Hiring', color: '#ec4899', icon: 'UserPlus' },
  [DecisionCategory.STRATEGY]: { label: 'Strategy', color: '#f59e0b', icon: 'Target' },
  [DecisionCategory.BUDGET]: { label: 'Budget', color: '#6366f1', icon: 'DollarSign' },
  [DecisionCategory.POLICY]: { label: 'Policy', color: '#14b8a6', icon: 'Shield' },
  [DecisionCategory.TECHNICAL]: { label: 'Technical', color: '#f97316', icon: 'Code' },
};

export const MOCK_TEAMS = [
  'Engineering', 'Product', 'Design', 'Marketing',
  'Sales', 'Operations', 'HR', 'Finance',
];
