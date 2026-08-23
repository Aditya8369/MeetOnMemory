/**
 * Mock data generator for the Meeting Insights Dashboard.
 */

import {
  InsightCategory, TrendDirection, InsightSeverity, TimeRange,
  MOCK_MEMBERS, MOCK_MEETING_TYPES,
} from './meetingInsightsTypes';

let _idCounter = 0;
const generateId = (prefix = 'id') => `${prefix}_${++_idCounter}_${Date.now()}`;

const randomBetween = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  return d.toISOString();
};

export function generateMockInsights(count = 12) {
  const templates = [
    { category: InsightCategory.ATTENDANCE, title: 'Attendance Rate Up 8%', description: 'Average attendance has improved from 72% to 80% over the past month. Sprint planning meetings show the highest attendance at 94%.', severity: InsightSeverity.POSITIVE, value: 80, unit: '%', trend: TrendDirection.IMPROVING, changePercent: 8.2 },
    { category: InsightCategory.ENGAGEMENT, title: 'Speaking Time Imbalanced', description: 'Top 3 speakers account for 68% of total meeting time. Consider structured turn-taking to improve participation equity.', severity: InsightSeverity.WARNING, value: 68, unit: '%', trend: TrendDirection.DECLINING, changePercent: -5.3 },
    { category: InsightCategory.DECISIONS, title: 'Decision Velocity Improved', description: 'Average time from proposal to decision has decreased from 3.2 days to 1.8 days. Architecture reviews are now resolved 40% faster.', severity: InsightSeverity.POSITIVE, value: 1.8, unit: 'days', trend: TrendDirection.IMPROVING, changePercent: 12.5 },
    { category: InsightCategory.ACTION_ITEMS, title: '23 Overdue Action Items', description: 'Action item completion rate dropped to 67%. 23 items are past their due date. Consider assigning dedicated owners for high-priority items.', severity: InsightSeverity.CRITICAL, value: 67, unit: '%', trend: TrendDirection.DECLINING, changePercent: -14.2 },
    { category: InsightCategory.SENTIMENT, title: 'Team Morale at 4.2/5', description: 'Average sentiment score across all meetings is 4.2/5. Retrospectives show the highest positive sentiment (4.6) while client syncs are lower (3.8).', severity: InsightSeverity.POSITIVE, value: 4.2, unit: '/5', trend: TrendDirection.IMPROVING, changePercent: 3.1 },
    { category: InsightCategory.COST, title: 'Meeting Cost: $12,400/month', description: 'Total organizational meeting cost this month is $12,400. 1-on-1s account for 35% of cost. Consider consolidating recurring low-attendance meetings.', severity: InsightSeverity.WARNING, value: 12400, unit: '$', trend: TrendDirection.STABLE, changePercent: 2.1 },
    { category: InsightCategory.FOLLOW_UP, title: '85% Follow-up Rate', description: 'Meetings with assigned follow-up actions increased to 85%. Teams using meeting templates show 92% follow-up compliance.', severity: InsightSeverity.POSITIVE, value: 85, unit: '%', trend: TrendDirection.IMPROVING, changePercent: 7.4 },
    { category: InsightCategory.PRODUCTIVITY, title: 'Meeting Load: 18.5 hrs/week', description: 'Average employee spends 18.5 hours per week in meetings. Engineers average 14.2 hrs while managers average 23.8 hrs.', severity: InsightSeverity.WARNING, value: 18.5, unit: 'hrs', trend: TrendDirection.DECLINING, changePercent: -3.8 },
    { category: InsightCategory.ATTENDANCE, title: 'No-Show Rate Decreased', description: 'No-show rate dropped from 18% to 11% after implementing calendar reminders. Client meetings now have only 5% no-show rate.', severity: InsightSeverity.POSITIVE, value: 11, unit: '%', trend: TrendDirection.IMPROVING, changePercent: 15.3 },
    { category: InsightCategory.ENGAGEMENT, title: 'Average Engagement: 78%', description: 'Meeting engagement score averaged 78% this month. Brainstorm sessions lead with 92% while status updates trail at 65%.', severity: InsightSeverity.NEUTRAL, value: 78, unit: '%', trend: TrendDirection.STABLE, changePercent: 1.2 },
    { category: InsightCategory.ACTION_ITEMS, title: 'Avg Completion: 4.2 days', description: 'Action items are now completed in an average of 4.2 days, down from 6.1 days last quarter. SLA compliance improved to 78%.', severity: InsightSeverity.POSITIVE, value: 4.2, unit: 'days', trend: TrendDirection.IMPROVING, changePercent: 22.4 },
    { category: InsightCategory.PRODUCTIVITY, title: 'Meeting Efficiency Score: 72', description: 'Overall meeting efficiency scored 72/100. Standups scored highest (91) while all-hands scored lowest (58). Focus on agenda-driven meetings.', severity: InsightSeverity.WARNING, value: 72, unit: '/100', trend: TrendDirection.STABLE, changePercent: 0.8 },
  ];

  return templates.slice(0, count).map((t, i) => ({
    id: generateId('insight'),
    ...t,
    createdAt: randomDate(30),
    updatedAt: randomDate(7),
    source: randomChoice(['AI Analysis', 'User Feedback', 'System Metric', 'Survey']),
    confidence: randomBetween(0.75, 0.98),
    actionable: Math.random() > 0.3,
    recommendedActions: generateActions(t.category),
  }));
}

function generateActions(category) {
  const actionMap = {
    [InsightCategory.ATTENDANCE]: ['Send calendar reminders 1h before', 'Set optional attendance for low-priority meetings', 'Implement async standup option'],
    [InsightCategory.ENGAGEMENT]: ['Use round-robin speaking order', 'Add anonymous polling for sensitive topics', 'Limit meetings to 6 participants max'],
    [InsightCategory.DECISIONS]: ['Document decision framework', 'Assign decision owner upfront', 'Set decision deadlines in agenda'],
    [InsightCategory.ACTION_ITEMS]: ['Assign single owner per action item', 'Set realistic deadlines during meeting', 'Add action items to project tracker'],
    [InsightCategory.SENTIMENT]: ['Run anonymous pulse survey', 'Add mood check-in at meeting start', 'Create safe space for feedback'],
    [InsightCategory.COST]: ['Consolidate overlapping meetings', 'Make low-priority meetings optional', 'Record and share async updates'],
    [InsightCategory.FOLLOW_UP]: ['Add follow-up section to meeting template', 'Set automated follow-up reminders', 'Review action items weekly'],
    [InsightCategory.PRODUCTIVITY]: ['Implement meeting-free blocks', 'Require agendas for all meetings', 'Enforce time-boxed discussions'],
  };
  return actionMap[category] || ['Review and analyze further'];
}

export function generateMockAttendanceTrend(weeks = 12) {
  const data = [];
  let base = 72;
  for (let i = 0; i < weeks; i++) {
    base += randomBetween(-3, 4);
    base = Math.max(55, Math.min(98, base));
    data.push({
      week: `W${i + 1}`,
      date: new Date(Date.now() - (weeks - i) * 7 * 86400000).toISOString().split('T')[0],
      rate: Math.round(base * 10) / 10,
      totalMeetings: randomInt(15, 35),
      avgParticipants: randomBetween(4, 12),
    });
  }
  return data;
}

export function generateMockEngagementData() {
  return MOCK_MEMBERS.map((m) => ({
    ...m,
    speakingTimePercent: randomBetween(5, 25),
    meetingsAttended: randomInt(8, 25),
    avgSentiment: randomBetween(3.2, 5.0),
    actionItemsCompleted: randomInt(2, 15),
    engagementScore: randomInt(55, 98),
  }));
}

export function generateMockMeetingTypeBreakdown() {
  return MOCK_MEETING_TYPES.map((type) => ({
    type,
    count: randomInt(5, 30),
    avgDuration: randomBetween(15, 90),
    avgAttendance: randomBetween(60, 98),
    avgSatisfaction: randomBetween(3.0, 4.8),
    totalCost: randomBetween(200, 3000),
  }));
}

export function generateMockWeeklyMetrics(weeks = 8) {
  const data = [];
  for (let i = 0; i < weeks; i++) {
    const date = new Date(Date.now() - (weeks - i) * 7 * 86400000);
    data.push({
      week: date.toISOString().split('T')[0],
      meetingsHeld: randomInt(18, 35),
      totalHours: randomBetween(25, 60),
      decisionsMade: randomInt(5, 20),
      actionItemsCreated: randomInt(10, 30),
      actionItemsCompleted: randomInt(8, 25),
      avgSentiment: randomBetween(3.5, 4.8),
      costUsd: randomBetween(2500, 5000),
    });
  }
  return data;
}

export function generateMockSentimentTimeline(days = 30) {
  const data = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - i) * 86400000);
    data.push({
      date: date.toISOString().split('T')[0],
      positive: randomBetween(40, 70),
      neutral: randomBetween(20, 40),
      negative: randomBetween(5, 20),
      score: randomBetween(3.0, 4.8),
    });
  }
  return data;
}

export function generateMockActionItemStats() {
  return {
    total: randomInt(80, 150),
    completed: randomInt(50, 100),
    inProgress: randomInt(15, 40),
    overdue: randomInt(5, 25),
    avgCompletionDays: randomBetween(2.5, 6.0),
    completionRate: randomBetween(60, 88),
    byPriority: {
      high: { total: randomInt(10, 30), completed: randomInt(5, 20) },
      medium: { total: randomInt(30, 60), completed: randomInt(20, 45) },
      low: { total: randomInt(20, 50), completed: randomInt(15, 40) },
    },
  };
}

export function generateMockMeetingEfficiency() {
  return MOCK_MEETING_TYPES.map((type) => ({
    type,
    efficiency: randomInt(45, 95),
    onTimeStart: randomBetween(60, 98),
    agendaAdherence: randomBetween(50, 95),
    followUpRate: randomBetween(55, 98),
    avgRating: randomBetween(3.0, 4.8),
  }));
}

export function generateMockStats() {
  return {
    totalMeetings: randomInt(120, 200),
    totalHours: randomBetween(300, 600),
    totalDecisions: randomInt(80, 180),
    totalActionItems: randomInt(200, 400),
    avgAttendance: randomBetween(70, 88),
    avgSentiment: randomBetween(3.8, 4.5),
    totalCost: randomBetween(12000, 25000),
    activeMembers: MOCK_MEMBERS.length,
    meetingGrowthPercent: randomBetween(-5, 15),
    efficiencyScore: randomInt(65, 85),
  };
}
