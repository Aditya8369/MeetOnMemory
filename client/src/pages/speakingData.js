/**
 * Mock data generator for the Speaking Time Analytics Dashboard.
 */

import {
  SpeakingRole, BalanceRating, TrendDirection,
  MOCK_MEMBERS, MOCK_MEETING_TYPES,
} from './speakingTypes';

let _idCounter = 0;
const generateId = (prefix = 'id') => `${prefix}_${++_idCounter}_${Date.now()}`;

const randomBetween = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getBalanceRating(score) {
  if (score >= 85) return BalanceRating.EXCELLENT;
  if (score >= 70) return BalanceRating.GOOD;
  if (score >= 45) return BalanceRating.BIASED;
  return BalanceRating.DOMINATED;
}

export function generateMockSpeakingDistribution() {
  const weights = [25, 18, 12, 10, 9, 8, 7, 5, 4, 2];
  return MOCK_MEMBERS.map((member, i) => {
    const minutes = randomBetween(2, 25);
    const interruptions = randomInt(0, 5);
    const avgTurnLength = randomBetween(0.5, 4.5);
    return {
      ...member,
      speakingMinutes: minutes,
      speakingPercent: 0,
      interruptions,
      avgTurnLength,
      longestTurn: randomBetween(1.5, 8),
      questionsAsked: randomInt(0, 8),
      questionsAnswered: randomInt(0, 6),
      interruptionsReceived: randomInt(0, 4),
    };
  }).map((m, _, arr) => {
    const total = arr.reduce((sum, m) => sum + m.speakingMinutes, 0);
    m.speakingPercent = Math.round((m.speakingMinutes / total) * 1000) / 10;
    return m;
  });
}

export function generateMockSpeakingTrend(weeks = 12) {
  const data = [];
  let baseBalance = 65;
  for (let i = 0; i < weeks; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks - i - 1) * 7);
    baseBalance += randomBetween(-5, 6);
    baseBalance = Math.max(35, Math.min(98, baseBalance));
    data.push({
      week: `W${i + 1}`,
      date: date.toISOString().split('T')[0],
      balanceScore: Math.round(baseBalance),
      avgTurnLength: randomBetween(1.5, 4.0),
      totalSpeakingMinutes: randomBetween(25, 60),
      interruptionRate: randomBetween(0.5, 3.5),
      silencePercent: randomBetween(5, 25),
    });
  }
  return data;
}

export function generateMockMeetingTypeSpeaking() {
  return MOCK_MEETING_TYPES.map((type) => ({
    type,
    avgBalance: randomBetween(40, 98),
    avgParticipants: randomBetween(3, 12),
    avgDuration: randomBetween(15, 90),
    dominantSpeakerPercent: randomBetween(20, 60),
    interruptionRate: randomBetween(0.5, 4),
    silencePercent: randomBetween(5, 25),
    avgTurnLength: randomBetween(1, 5),
    meetingCount: randomInt(5, 30),
  }));
}

export function generateMockInterruptionMatrix() {
  return MOCK_MEMBERS.slice(0, 8).map((m1) => ({
    name: m1.name,
    avatar: m1.avatar,
    interruptions: MOCK_MEMBERS.filter((m2) => m2.id !== m1.id).slice(0, 5).map((m2) => ({
      target: m2.name,
      count: randomInt(0, 6),
    })),
  }));
}

export function generateMockSpeakingPatterns() {
  return MOCK_MEMBERS.map((member) => ({
    ...member,
    avgWordsPerTurn: randomBetween(15, 80),
    avgTurnsPerMeeting: randomBetween(3, 15),
    longestMonologue: randomBetween(1, 8),
    questionToStatementRatio: randomBetween(0.1, 0.8),
    interruptionTendency: randomBetween(0, 5),
    listeningScore: randomInt(40, 98),
    collaborationScore: randomInt(50, 98),
    speakingGrowth: randomBetween(-15, 25),
  }));
}

export function generateMockTurnSequence(meetingMinutes = 45) {
  const turns = [];
  let currentTime = 0;
  const members = MOCK_MEMBERS.slice(0, 6);

  while (currentTime < meetingMinutes) {
    const speaker = randomChoice(members);
    const duration = randomBetween(0.3, 3);
    const silence = randomBetween(0.1, 0.8);
    const interrupted = Math.random() > 0.85;

    turns.push({
      id: generateId('turn'),
      speaker: speaker.name,
      avatar: speaker.avatar,
      startTime: Math.round(currentTime * 10) / 10,
      duration: Math.round(duration * 10) / 10,
      type: Math.random() > 0.7 ? 'question' : Math.random() > 0.5 ? 'statement' : 'response',
      interrupted,
    });

    currentTime += duration + silence;
    if (interrupted) currentTime += 0.2;
  }

  return turns;
}

export function generateMockSilenceAnalysis() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour}:00`,
    silencePercent: hour >= 9 && hour <= 17 ? randomBetween(8, 20) : randomBetween(20, 40),
    avgPauseLength: randomBetween(0.5, 3),
    awkwardPauses: randomInt(0, 5),
  }));
}

export function generateMockStats() {
  return {
    avgBalanceScore: randomBetween(60, 88),
    avgTurnLength: randomBetween(1.5, 3.5),
    totalSpeakingHours: randomBetween(40, 120),
    avgParticipantsPerMeeting: randomBetween(5, 10),
    meetingsAnalyzed: randomInt(80, 200),
    avgSilencePercent: randomBetween(10, 20),
    topSpeaker: randomChoice(MOCK_MEMBERS).name,
    mostImproved: randomChoice(MOCK_MEMBERS).name,
  };
}

export function generateMockRecommendations() {
  return [
    { id: generateId('rec'), title: 'Implement Round-Robin Input', description: 'Use structured turn-taking in sprint planning to ensure all voices are heard. Current data shows 3 speakers dominate 60% of time.', impact: 'high', category: 'Facilitation', estimatedImprovement: 18 },
    { id: generateId('rec'), title: 'Set Speaking Time Limits', description: 'Cap individual turns at 2 minutes during design reviews. This will increase participation from quieter team members.', impact: 'medium', category: 'Structure', estimatedImprovement: 12 },
    { id: generateId('rec'), title: 'Anonymous Pre-Meeting Questions', description: 'Allow participants to submit questions before brainstorms. Increases engagement by 25% for introverted team members.', impact: 'high', category: 'Engagement', estimatedImprovement: 15 },
    { id: generateId('rec'), title: 'Paired Discussion Rounds', description: 'Start meetings with 2-minute paired discussions before group sharing. Reduces dominance by top speakers by 30%.', impact: 'medium', category: 'Format', estimatedImprovement: 10 },
    { id: generateId('rec'), title: 'Meeting Facilitation Training', description: 'Train team leads on inclusive facilitation techniques. Projects 20% improvement in balance scores within 4 weeks.', impact: 'high', category: 'Training', estimatedImprovement: 22 },
    { id: generateId('rec'), title: 'Silence Timer for Reflection', description: 'Add 30-second silent reflection periods before group discussions. Improves thought quality and reduces impulsive speaking.', impact: 'low', category: 'Pacing', estimatedImprovement: 5 },
  ];
}
