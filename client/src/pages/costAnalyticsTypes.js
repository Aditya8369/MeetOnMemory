/**
 * Data models and constants for the Meeting Cost Analytics Dashboard.
 */

export const CostCategory = {
  SALARY: "salary",
  INFRASTRUCTURE: "infrastructure",
  TOOLS: "tools",
  TRAVEL: "travel",
  VENUE: "venue",
  CATERING: "catering",
  OTHER: "other",
};

export const CostTrend = {
  INCREASING: "increasing",
  STABLE: "stable",
  DECREASING: "decreasing",
};

export const EfficiencyRating = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
};

export const TimeRange = {
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
};

export const CATEGORY_CONFIG = {
  [CostCategory.SALARY]: {
    label: "Salary Costs",
    icon: "DollarSign",
    color: "#8b5cf6",
    bgColor: "bg-violet-50 dark:bg-violet-900/30",
    textColor: "text-violet-600 dark:text-violet-400",
  },
  [CostCategory.INFRASTRUCTURE]: {
    label: "Infrastructure",
    icon: "Server",
    color: "#0ea5e9",
    bgColor: "bg-sky-50 dark:bg-sky-900/30",
    textColor: "text-sky-600 dark:text-sky-400",
  },
  [CostCategory.TOOLS]: {
    label: "Tools & Software",
    icon: "Wrench",
    color: "#22c55e",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  [CostCategory.TRAVEL]: {
    label: "Travel",
    icon: "Plane",
    color: "#f59e0b",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  [CostCategory.VENUE]: {
    label: "Venue",
    icon: "Building",
    color: "#ec4899",
    bgColor: "bg-pink-50 dark:bg-pink-900/30",
    textColor: "text-pink-600 dark:text-pink-400",
  },
  [CostCategory.CATERING]: {
    label: "Catering",
    icon: "Coffee",
    color: "#f97316",
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  [CostCategory.OTHER]: {
    label: "Other",
    icon: "MoreHorizontal",
    color: "#6b7280",
    bgColor: "bg-gray-50 dark:bg-gray-800",
    textColor: "text-gray-600 dark:text-gray-400",
  },
};

export const EFFICIENCY_CONFIG = {
  [EfficiencyRating.EXCELLENT]: {
    label: "Excellent",
    color: "#22c55e",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    minScore: 85,
  },
  [EfficiencyRating.GOOD]: {
    label: "Good",
    color: "#0ea5e9",
    bgColor: "bg-sky-50 dark:bg-sky-900/30",
    textColor: "text-sky-600 dark:text-sky-400",
    minScore: 70,
  },
  [EfficiencyRating.FAIR]: {
    label: "Fair",
    color: "#f59e0b",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    textColor: "text-amber-600 dark:text-amber-400",
    minScore: 50,
  },
  [EfficiencyRating.POOR]: {
    label: "Poor",
    color: "#ef4444",
    bgColor: "bg-red-50 dark:bg-red-900/30",
    textColor: "text-red-600 dark:text-red-400",
    minScore: 0,
  },
};

export const MOCK_DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "HR",
  "Finance",
];

export const MOCK_MEETING_TYPES = [
  "Standup",
  "Sprint Planning",
  "Retrospective",
  "Design Review",
  "Architecture Review",
  "1-on-1",
  "All Hands",
  "Brainstorm",
  "Client Sync",
  "Technical Deep Dive",
  "Board Meeting",
  "Workshop",
];

export const MOCK_MEMBERS = [
  {
    id: "m1",
    name: "Sarah Chen",
    role: "Product Lead",
    department: "Product",
    hourlyRate: 95,
  },
  {
    id: "m2",
    name: "James Wilson",
    role: "Engineering Manager",
    department: "Engineering",
    hourlyRate: 110,
  },
  {
    id: "m3",
    name: "Priya Sharma",
    role: "Designer",
    department: "Design",
    hourlyRate: 80,
  },
  {
    id: "m4",
    name: "Alex Rivera",
    role: "Backend Developer",
    department: "Engineering",
    hourlyRate: 85,
  },
  {
    id: "m5",
    name: "Emma Thompson",
    role: "QA Lead",
    department: "Engineering",
    hourlyRate: 90,
  },
  {
    id: "m6",
    name: "David Kim",
    role: "DevOps Engineer",
    department: "Engineering",
    hourlyRate: 95,
  },
  {
    id: "m7",
    name: "Lisa Park",
    role: "Scrum Master",
    department: "Operations",
    hourlyRate: 75,
  },
  {
    id: "m8",
    name: "Marcus Johnson",
    role: "Frontend Developer",
    department: "Engineering",
    hourlyRate: 85,
  },
  {
    id: "m9",
    name: "Rachel Green",
    role: "Marketing Manager",
    department: "Marketing",
    hourlyRate: 80,
  },
  {
    id: "m10",
    name: "Tom Harris",
    role: "Sales Director",
    department: "Sales",
    hourlyRate: 100,
  },
  {
    id: "m11",
    name: "Nina Patel",
    role: "HR Business Partner",
    department: "HR",
    hourlyRate: 70,
  },
  {
    id: "m12",
    name: "Carlos Mendez",
    role: "Finance Analyst",
    department: "Finance",
    hourlyRate: 75,
  },
];
