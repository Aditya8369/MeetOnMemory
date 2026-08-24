/**
 * Mock data generator for the Meeting Cost Analytics Dashboard.
 */

import {
  CostCategory,
  CostTrend,
  EfficiencyRating,
  MOCK_DEPARTMENTS,
  MOCK_MEETING_TYPES,
  MOCK_MEMBERS,
} from "./costAnalyticsTypes";

let _idCounter = 0;
const generateId = (prefix = "id") => `${prefix}_${++_idCounter}_${Date.now()}`;

const randomBetween = (min, max) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function generateMockCostSummary() {
  return {
    totalCostMonth: randomBetween(15000, 28000),
    totalCostLastMonth: randomBetween(14000, 26000),
    avgCostPerMeeting: randomBetween(150, 450),
    avgCostPerParticipant: randomBetween(25, 75),
    totalMeetingsMonth: randomInt(80, 180),
    totalParticipantHours: randomBetween(400, 900),
    costPerHour: randomBetween(30, 60),
    savingsFromOptimization: randomBetween(800, 3500),
    projectedAnnualCost: randomBetween(180000, 350000),
    budgetUtilization: randomBetween(65, 95),
  };
}

export function generateMockMonthlyCosts(months = 8) {
  const data = [];
  let base = 18000;
  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - i - 1));
    base += randomBetween(-2000, 2500);
    base = Math.max(10000, Math.min(35000, base));

    data.push({
      month: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      totalCost: Math.round(base),
      salaryCost: Math.round(base * randomBetween(0.55, 0.7)),
      infrastructureCost: Math.round(base * randomBetween(0.1, 0.18)),
      toolsCost: Math.round(base * randomBetween(0.08, 0.14)),
      otherCost: Math.round(base * randomBetween(0.05, 0.12)),
      meetingCount: randomInt(70, 160),
      participantHours: randomBetween(350, 800),
    });
  }
  return data;
}

export function generateMockDepartmentCosts() {
  return MOCK_DEPARTMENTS.map((dept) => ({
    department: dept,
    totalCost: randomBetween(2000, 6000),
    meetingCount: randomInt(15, 45),
    avgCostPerMeeting: randomBetween(120, 400),
    avgParticipants: randomBetween(3, 12),
    avgDuration: randomBetween(25, 75),
    costEfficiency: randomBetween(55, 98),
    trend: randomChoice([
      CostTrend.INCREASING,
      CostTrend.STABLE,
      CostTrend.DECREASING,
    ]),
    topCostDriver: randomChoice(["Salary", "Tools", "Infrastructure"]),
  }));
}

export function generateMockMeetingTypeCosts() {
  return MOCK_MEETING_TYPES.map((type) => ({
    type,
    totalCost: randomBetween(800, 5000),
    meetingCount: randomInt(5, 35),
    avgCostPerMeeting: randomBetween(100, 500),
    avgDuration: randomBetween(15, 120),
    avgParticipants: randomBetween(3, 15),
    costPerMinute: randomBetween(5, 25),
    efficiencyScore: randomInt(40, 98),
    roi: randomBetween(0.8, 3.5),
  }));
}

export function generateMockMemberCosts() {
  return MOCK_MEMBERS.map((member) => ({
    ...member,
    totalMeetingCost: randomBetween(500, 3000),
    meetingsAttended: randomInt(10, 40),
    totalMeetingHours: randomBetween(15, 60),
    avgMeetingCost: randomBetween(50, 200),
    costAsPercentOfSalary: randomBetween(2, 12),
    productivityScore: randomInt(55, 98),
    recommendedReduction: randomInt(0, 25),
  }));
}

export function generateMockCostBreakdown() {
  return [
    {
      category: CostCategory.SALARY,
      amount: randomBetween(10000, 18000),
      percent: 0,
      label: "Salary Costs",
    },
    {
      category: CostCategory.INFRASTRUCTURE,
      amount: randomBetween(1500, 3500),
      percent: 0,
      label: "Infrastructure",
    },
    {
      category: CostCategory.TOOLS,
      amount: randomBetween(1000, 2500),
      percent: 0,
      label: "Tools & Software",
    },
    {
      category: CostCategory.TRAVEL,
      amount: randomBetween(500, 2000),
      percent: 0,
      label: "Travel",
    },
    {
      category: CostCategory.VENUE,
      amount: randomBetween(300, 1500),
      percent: 0,
      label: "Venue",
    },
    {
      category: CostCategory.CATERING,
      amount: randomBetween(200, 1000),
      percent: 0,
      label: "Catering",
    },
    {
      category: CostCategory.OTHER,
      amount: randomBetween(200, 800),
      percent: 0,
      label: "Other",
    },
  ].map((item) => {
    const total = 15000;
    item.percent = Math.round((item.amount / total) * 100);
    return item;
  });
}

export function generateMockCostEfficiency(months = 8) {
  const data = [];
  let base = 70;
  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - i - 1));
    base += randomBetween(-5, 6);
    base = Math.max(45, Math.min(95, base));
    data.push({
      month: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      efficiencyScore: Math.round(base),
      costPerDecision: randomBetween(50, 250),
      avgMeetingRating: randomBetween(3.0, 4.8),
      onTimeStartRate: randomBetween(60, 98),
      agendaAdherence: randomBetween(50, 95),
    });
  }
  return data;
}

export function generateMockROIAnalysis() {
  return MOCK_MEETING_TYPES.map((type) => ({
    type,
    investment: randomBetween(500, 4000),
    outcomes: randomBetween(800, 12000),
    roi: randomBetween(0.8, 4.0),
    decisionCount: randomInt(2, 20),
    actionItemsGenerated: randomInt(3, 25),
    participantSatisfaction: randomBetween(3.0, 4.9),
    costPerOutcome: randomBetween(30, 200),
    isProfitable: Math.random() > 0.3,
  }));
}

export function generateMockBudgetComparison() {
  return MOCK_DEPARTMENTS.map((dept) => ({
    department: dept,
    budget: randomBetween(3000, 8000),
    actual: randomBetween(2000, 7000),
    variance: 0,
    utilization: 0,
  })).map((item) => {
    item.variance = item.budget - item.actual;
    item.utilization = Math.round((item.actual / item.budget) * 100);
    return item;
  });
}

export function generateMockHourlyCostDistribution() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour}:00`,
    meetingCount: hour >= 9 && hour <= 17 ? randomInt(5, 25) : randomInt(0, 3),
    avgCost:
      hour >= 9 && hour <= 17
        ? randomBetween(150, 400)
        : randomBetween(50, 150),
    totalCost: 0,
  })).map((item) => {
    item.totalCost = Math.round(item.meetingCount * item.avgCost);
    return item;
  });
}

export function generateMockCostRecommendations() {
  return [
    {
      id: generateId("rec"),
      title: "Consolidate Standup Meetings",
      description:
        "Merge 3 overlapping standup meetings into 1 daily sync. Potential savings: $2,400/month.",
      savings: 2400,
      impact: "high",
      category: "Consolidation",
      effort: "low",
    },
    {
      id: generateId("rec"),
      title: "Limit All-Hands Duration",
      description:
        "Reduce all-hands from 90min to 60min. Average cost drops by $1,200 per session.",
      savings: 1200,
      impact: "medium",
      category: "Duration",
      effort: "low",
    },
    {
      id: generateId("rec"),
      title: "Async Design Reviews",
      description:
        "Replace 40% of design review meetings with async Loom videos. Save ~$1,800/month.",
      savings: 1800,
      impact: "high",
      category: "Async",
      effort: "medium",
    },
    {
      id: generateId("rec"),
      title: "Meeting-Free Wednesdays",
      description:
        "Implement meeting-free Wednesdays to reduce meeting load by 20%. Estimated savings: $3,500/month.",
      savings: 3500,
      impact: "high",
      category: "Policy",
      effort: "medium",
    },
    {
      id: generateId("rec"),
      title: "Reduce 1-on-1 Frequency",
      description:
        "Move bi-weekly 1-on-1s to monthly for non-managers. Save $1,500/month in salary costs.",
      savings: 1500,
      impact: "medium",
      category: "Frequency",
      effort: "low",
    },
    {
      id: generateId("rec"),
      title: "Optimize Room Booking",
      description:
        "Use AI-powered room allocation to reduce venue waste by 30%. Save $800/month.",
      savings: 800,
      impact: "low",
      category: "Venue",
      effort: "high",
    },
  ];
}
