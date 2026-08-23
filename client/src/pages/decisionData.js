/**
 * Mock data generator for the Decision Tracking Dashboard.
 */

import {
  DecisionStatus,
  DecisionImpact,
  DecisionCategory,
  MOCK_TEAMS,
} from "./decisionTypes";

let _idCounter = 0;
const generateId = (prefix = "id") => `${prefix}_${++_idCounter}_${Date.now()}`;

const randomBetween = (min, max) =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const MOCK_DECISION_TITLES = [
  {
    title: "Adopt GraphQL for API Layer",
    category: DecisionCategory.ARCHITECTURE,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Switch to 2-week sprint cycles",
    category: DecisionCategory.PROCESS,
    impact: DecisionImpact.MEDIUM,
    team: "Product",
  },
  {
    title: "Deploy Figma for design collaboration",
    category: DecisionCategory.TOOLING,
    impact: DecisionImpact.LOW,
    team: "Design",
  },
  {
    title: "Hire 3 senior engineers",
    category: DecisionCategory.HIRING,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Q3 product roadmap priorities",
    category: DecisionCategory.STRATEGY,
    impact: DecisionImpact.CRITICAL,
    team: "Product",
  },
  {
    title: "Increase cloud budget by 40%",
    category: DecisionCategory.BUDGET,
    impact: DecisionImpact.HIGH,
    team: "Finance",
  },
  {
    title: "Remote work policy update",
    category: DecisionCategory.POLICY,
    impact: DecisionImpact.MEDIUM,
    team: "HR",
  },
  {
    title: "Migrate to TypeScript monorepo",
    category: DecisionCategory.TECHNICAL,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Implement OKR framework",
    category: DecisionCategory.PROCESS,
    impact: DecisionImpact.MEDIUM,
    team: "Operations",
  },
  {
    title: "Launch beta program",
    category: DecisionCategory.STRATEGY,
    impact: DecisionImpact.CRITICAL,
    team: "Marketing",
  },
  {
    title: "Adopt CI/CD pipeline",
    category: DecisionCategory.TOOLING,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Data privacy compliance audit",
    category: DecisionCategory.POLICY,
    impact: DecisionImpact.CRITICAL,
    team: "Legal",
  },
  {
    title: "Restructure engineering teams",
    category: DecisionCategory.STRATEGY,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Introduce code review guidelines",
    category: DecisionCategory.PROCESS,
    impact: DecisionImpact.LOW,
    team: "Engineering",
  },
  {
    title: "Invest in ML infrastructure",
    category: DecisionCategory.ARCHITECTURE,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Quarterly budget reallocation",
    category: DecisionCategory.BUDGET,
    impact: DecisionImpact.MEDIUM,
    team: "Finance",
  },
  {
    title: "Design system adoption",
    category: DecisionCategory.TECHNICAL,
    impact: DecisionImpact.MEDIUM,
    team: "Design",
  },
  {
    title: "Performance review process",
    category: DecisionCategory.POLICY,
    impact: DecisionImpact.LOW,
    team: "HR",
  },
  {
    title: "API versioning strategy",
    category: DecisionCategory.ARCHITECTURE,
    impact: DecisionImpact.HIGH,
    team: "Engineering",
  },
  {
    title: "Market expansion analysis",
    category: DecisionCategory.STRATEGY,
    impact: DecisionImpact.CRITICAL,
    team: "Sales",
  },
];

export function generateMockDecisions(count = 20) {
  const statuses = Object.values(DecisionStatus);
  return MOCK_DECISION_TITLES.slice(0, count).map((d) => {
    const status = randomChoice(statuses);
    const decidedDate = new Date(Date.now() - randomInt(1, 90) * 86400000);
    const implementDate =
      status === DecisionStatus.IMPLEMENTED
        ? new Date(decidedDate.getTime() + randomInt(7, 45) * 86400000)
        : null;

    return {
      id: generateId("decision"),
      title: d.title,
      description: `Decision regarding ${d.title.toLowerCase()} for the ${d.team} team. This was discussed across ${randomInt(2, 5)} meetings before reaching resolution.`,
      category: d.category,
      impact: d.impact,
      status,
      team: d.team,
      decidedBy: randomChoice([
        "Sarah Chen",
        "James Wilson",
        "Lisa Park",
        "Architecture Board",
      ]),
      participants: randomInt(3, 12),
      decidedAt: decidedDate.toISOString(),
      implementedAt: implementDate ? implementDate.toISOString() : null,
      implementationDays: implementDate
        ? Math.round(
            (implementDate.getTime() - decidedDate.getTime()) / 86400000,
          )
        : null,
      meetingCount: randomInt(1, 5),
      votesFor: randomInt(3, 10),
      votesAgainst: randomInt(0, 3),
      confidence: randomBetween(0.6, 0.98),
      tags: [d.category, d.team.toLowerCase()],
      followUpActions: randomInt(2, 8),
      completedActions: randomInt(0, 6),
      riskScore: randomBetween(0.1, 0.8),
    };
  });
}

export function generateMockDecisionTrend(weeks = 12) {
  const data = [];
  for (let i = 0; i < weeks; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks - i - 1) * 7);
    data.push({
      week: `W${i + 1}`,
      date: date.toISOString().split("T")[0],
      proposed: randomInt(3, 8),
      approved: randomInt(2, 6),
      implemented: randomInt(1, 4),
      rejected: randomInt(0, 2),
      avgDaysToDecide: randomBetween(2, 8),
    });
  }
  return data;
}

export function generateMockDecisionByCategory() {
  return Object.values(DecisionCategory).map((cat) => ({
    category: cat,
    count: randomInt(5, 20),
    implemented: randomInt(2, 12),
    avgImplementationDays: randomBetween(10, 45),
    avgConfidence: randomBetween(0.7, 0.95),
  }));
}

export function generateMockDecisionByImpact() {
  return Object.values(DecisionImpact).map((impact) => ({
    impact,
    count: randomInt(3, 15),
    avgImplementationDays: randomBetween(5, 60),
    successRate: randomBetween(60, 95),
  }));
}

export function generateMockImplementationTimeline() {
  return Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    approved: randomInt(2, 6),
    implemented: randomInt(1, 5),
    avgDays: randomBetween(10, 40),
  }));
}

export function generateMockDecisionVelocity(months = 6) {
  const data = [];
  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - i - 1));
    data.push({
      month: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      totalDecisions: randomInt(10, 30),
      avgTimeToDecision: randomBetween(2, 7),
      decisionRate: randomBetween(3, 8),
      stakeholderSatisfaction: randomBetween(65, 95),
    });
  }
  return data;
}

export function generateMockStats() {
  return {
    totalDecisions: randomInt(80, 200),
    implementedCount: randomInt(40, 120),
    pendingCount: randomInt(10, 30),
    avgDaysToDecide: randomBetween(3, 8),
    avgDaysToImplement: randomBetween(15, 35),
    implementationRate: randomBetween(65, 90),
    avgConfidence: randomBetween(0.75, 0.92),
    totalFollowUps: randomInt(100, 300),
    completedFollowUps: randomInt(60, 200),
  };
}

export function generateMockRecommendations() {
  return [
    {
      id: generateId("rec"),
      title: "Standardize Decision Templates",
      description:
        "Use RFC-style templates for all high-impact decisions. Currently 40% lack structured documentation.",
      impact: "high",
      category: "Process",
      estimatedImprovement: 15,
    },
    {
      id: generateId("rec"),
      title: "Set Decision Deadlines",
      description:
        "All proposed decisions should have a 7-day decision window. Reduces deliberation time by 25%.",
      impact: "high",
      category: "Velocity",
      estimatedImprovement: 18,
    },
    {
      id: generateId("rec"),
      title: "Decision Review Board",
      description:
        "Establish a cross-functional board for critical decisions. Improves stakeholder alignment by 30%.",
      impact: "medium",
      category: "Governance",
      estimatedImprovement: 12,
    },
    {
      id: generateId("rec"),
      title: "Automated Follow-up Tracking",
      description:
        "Auto-assign follow-up deadlines when decisions are approved. Reduces missed actions by 40%.",
      impact: "medium",
      category: "Tracking",
      estimatedImprovement: 10,
    },
    {
      id: generateId("rec"),
      title: "Decision Retrospectives",
      description:
        "Quarterly review of past decisions to learn from outcomes. Improves future decision quality by 20%.",
      impact: "medium",
      category: "Learning",
      estimatedImprovement: 8,
    },
    {
      id: generateId("rec"),
      title: "Impact-Based Routing",
      description:
        "Route decisions to appropriate approval levels based on impact. Critical decisions get executive review.",
      impact: "low",
      category: "Efficiency",
      estimatedImprovement: 5,
    },
  ];
}
