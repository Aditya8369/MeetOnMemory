/**
 * Mock data generator for the Meeting Health Dashboard.
 */

import {
  HealthMetric, HealthStatus, TrendDirection, IssueSeverity,
  MOCK_TEAMS, MOCK_MEETING_TYPES,
} from './healthTypes';

let _idCounter = 0;
const generateId = (prefix = 'id') => `${prefix}_${++_idCounter}_${Date.now()}`;

const randomBetween = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function getStatusForScore(score) {
  if (score >= 85) return HealthStatus.EXCELLENT;
  if (score >= 70) return HealthStatus.GOOD;
  if (score >= 50) return HealthStatus.FAIR;
  if (score >= 30) return HealthStatus.POOR;
  return HealthStatus.CRITICAL;
}

export function generateMockHealthScores() {
  return Object.values(HealthMetric).map((metric) => {
    const score = randomBetween(40, 98);
    const trend = score > 75 ? randomChoice([TrendDirection.IMPROVING, TrendDirection.STABLE])
      : score > 50 ? randomChoice([TrendDirection.STABLE, TrendDirection.DECLINING])
      : TrendDirection.DECLINING;
    return {
      metric,
      score: Math.round(score),
      status: getStatusForScore(score),
      trend,
      changePercent: randomBetween(-12, 15),
      lastUpdated: new Date(Date.now() - randomInt(0, 7) * 86400000).toISOString(),
    };
  });
}

export function generateMockOverallHealth() {
  const scores = generateMockHealthScores();
  const avg = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  return {
    overallScore: avg,
    status: getStatusForScore(avg),
    grade: avg >= 85 ? 'A' : avg >= 75 ? 'B' : avg >= 60 ? 'C' : avg >= 45 ? 'D' : 'F',
    totalMeetingsAnalyzed: randomInt(150, 350),
    totalIssuesFound: randomInt(15, 60),
    resolvedIssues: randomInt(10, 45),
    improvementRate: randomBetween(5, 25),
    scores,
  };
}

export function generateMockHealthTrend(weeks = 12) {
  const data = [];
  let base = 68;
  for (let i = 0; i < weeks; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks - i - 1) * 7);
    base += randomBetween(-4, 5);
    base = Math.max(40, Math.min(98, base));
    data.push({
      week: `W${i + 1}`,
      date: date.toISOString().split('T')[0],
      overall: Math.round(base),
      attendance: Math.round(base + randomBetween(-5, 8)),
      punctuality: Math.round(base + randomBetween(-8, 5)),
      engagement: Math.round(base + randomBetween(-10, 10)),
      followUp: Math.round(base + randomBetween(-6, 7)),
    });
  }
  return data;
}

export function generateMockTeamHealth() {
  return MOCK_TEAMS.map((team) => ({
    team,
    overallScore: randomInt(50, 95),
    attendanceRate: randomBetween(60, 98),
    punctualityRate: randomBetween(65, 98),
    engagementScore: randomBetween(50, 95),
    meetingLoad: randomBetween(8, 28),
    avgDuration: randomBetween(20, 75),
    followUpRate: randomBetween(55, 98),
    issuesCount: randomInt(0, 8),
    trend: randomChoice([TrendDirection.IMPROVING, TrendDirection.STABLE, TrendDirection.DECLINING]),
  }));
}

export function generateMockIssues(count = 15) {
  const templates = [
    { severity: IssueSeverity.CRITICAL, title: 'Zero agenda in 5 consecutive meetings', description: 'Team has conducted 5 meetings without publishing agendas. This significantly impacts productivity.', team: 'Engineering', metric: HealthMetric.PREPARATION },
    { severity: IssueSeverity.ERROR, title: 'Attendance dropped below 60%', description: 'Average attendance for weekly standups has fallen to 58% over the past 2 weeks.', team: 'Product', metric: HealthMetric.ATTENDANCE },
    { severity: IssueSeverity.WARNING, title: 'Meetings consistently overrun', description: '73% of sprint planning meetings exceeded their scheduled duration by more than 15 minutes.', team: 'Engineering', metric: HealthMetric.DURATION },
    { severity: IssueSeverity.WARNING, title: 'Low engagement in all-hands', description: 'Engagement score for all-hands meetings is 45/100. Consider restructuring format.', team: 'Operations', metric: HealthMetric.ENGAGEMENT },
    { severity: IssueSeverity.INFO, title: 'On-time start improving', description: 'Punctuality has improved from 72% to 84% after implementing 5-minute buffer reminders.', team: 'Design', metric: HealthMetric.PUNCTUALITY },
    { severity: IssueSeverity.ERROR, title: 'No follow-up actions documented', description: '42% of client sync meetings have no documented follow-up actions or owners.', team: 'Sales', metric: HealthMetric.FOLLOW_UP },
    { severity: IssueSeverity.WARNING, title: 'Decision clarity below target', description: 'Only 62% of architecture reviews have clearly documented decisions and rationale.', team: 'Engineering', metric: HealthMetric.DECISIONS },
    { severity: IssueSeverity.INFO, title: 'Agenda coverage improving', description: 'Agenda item coverage has increased from 68% to 82% after template adoption.', team: 'Product', metric: HealthMetric.AGENDA },
    { severity: IssueSeverity.CRITICAL, title: 'Meeting fatigue detected', description: 'Team averages 25+ hours/week in meetings. Recommend immediate meeting audit.', team: 'Marketing', metric: HealthMetric.ENGAGEMENT },
    { severity: IssueSeverity.WARNING, title: '1-on-1 preparation lacking', description: 'Only 40% of 1-on-1 meetings have pre-shared discussion topics.', team: 'HR', metric: HealthMetric.PREPARATION },
    { severity: IssueSeverity.ERROR, title: 'Recurring meeting ghost', description: '3 recurring meetings have had 0 attendance for 3+ weeks but remain scheduled.', team: 'Finance', metric: HealthMetric.ATTENDANCE },
    { severity: IssueSeverity.INFO, title: 'Retrospective quality high', description: 'Retrospective meetings score 92/100 on health metrics. Great job!', team: 'Engineering', metric: HealthMetric.ENGAGEMENT },
    { severity: IssueSeverity.WARNING, title: 'Late starts in standups', description: 'Standup meetings start an average of 8 minutes late, disrupting downstream meetings.', team: 'Engineering', metric: HealthMetric.PUNCTUALITY },
    { severity: IssueSeverity.ERROR, title: 'Action items never completed', description: '38% of action items from brainstorm sessions remain open after 30 days.', team: 'Design', metric: HealthMetric.FOLLOW_UP },
    { severity: IssueSeverity.INFO, title: 'Decision log updated', description: 'Decision documentation rate improved to 88% after introducing decision log templates.', team: 'Product', metric: HealthMetric.DECISIONS },
  ];

  return templates.slice(0, count).map((t, i) => ({
    id: generateId('issue'),
    ...t,
    createdAt: new Date(Date.now() - randomInt(1, 30) * 86400000).toISOString(),
    isResolved: Math.random() > 0.6,
    resolvedAt: Math.random() > 0.6 ? new Date(Date.now() - randomInt(0, 7) * 86400000).toISOString() : null,
    assignedTo: randomChoice(['Lisa Park', 'Sarah Chen', 'James Wilson', 'Unassigned']),
  }));
}

export function generateMockMeetingHealthDetails() {
  return MOCK_MEETING_TYPES.map((type) => ({
    type,
    healthScore: randomInt(45, 98),
    attendanceRate: randomBetween(55, 98),
    punctualityRate: randomBetween(60, 98),
    agendaCompliance: randomBetween(40, 95),
    durationAdherence: randomBetween(50, 95),
    engagementScore: randomBetween(45, 95),
    followUpRate: randomBetween(50, 98),
    avgParticipants: randomBetween(3, 15),
    avgDuration: randomBetween(15, 90),
    meetingCount: randomInt(5, 35),
    issuesFound: randomInt(0, 5),
  }));
}

export function generateMockActionableInsights() {
  return [
    { id: generateId('ins'), title: 'Implement Agenda Templates', description: 'Teams using agenda templates show 35% higher meeting health scores. Roll out standardized templates.', impact: 'high', category: 'Preparation', effort: 'low', estimatedImprovement: 12 },
    { id: generateId('ins'), title: 'Set Meeting Time Limits', description: 'Auto-enforce duration limits with 5-minute warnings. Reduces overruns by 40%.', impact: 'high', category: 'Duration', effort: 'medium', estimatedImprovement: 15 },
    { id: generateId('ins'), title: 'Meeting-Free Morning Block', description: 'Block 9-11 AM for focus time. Reduces meeting load by 20% and improves engagement.', impact: 'medium', category: 'Load', effort: 'high', estimatedImprovement: 18 },
    { id: generateId('ins'), title: 'Automated Follow-up Reminders', description: 'Send action item reminders 24h and 72h after meetings. Improves completion by 28%.', impact: 'medium', category: 'Follow-up', effort: 'low', estimatedImprovement: 8 },
    { id: generateId('ins'), title: 'Punctuality Gamification', description: 'Reward teams with best on-time start rates. Early data shows 15% improvement.', impact: 'low', category: 'Punctuality', effort: 'low', estimatedImprovement: 6 },
    { id: generateId('ins'), title: 'Meeting Audit Quarterly', description: 'Review all recurring meetings quarterly. Remove inactive meetings and consolidate overlaps.', impact: 'high', category: 'Load', effort: 'medium', estimatedImprovement: 20 },
  ];
}
