import React, { useState, useMemo } from "react";
import {
  Mic, Users, Clock, BarChart3, Lightbulb, Activity,
  TrendingUp, Timer, MessageSquare, AlertTriangle,
  Sparkles, Filter, RotateCcw,
} from "lucide-react";
import {
  SpeakingMetricCard, SpeakerCard, BalanceScoreCard,
  PatternCard, SpeakingRecommendationCard,
} from "./SpeakingCards";
import {
  SpeakingDistributionPie, BalanceTrendChart,
  MeetingTypeComparisonChart, TurnSequenceChart,
  PatternRadarChart, SilenceAnalysisChart, InterruptionHeatmapChart,
} from "./SpeakingCharts";
import {
  generateMockSpeakingDistribution, generateMockSpeakingTrend,
  generateMockMeetingTypeSpeaking, generateMockInterruptionMatrix,
  generateMockSpeakingPatterns, generateMockTurnSequence,
  generateMockSilenceAnalysis, generateMockStats, generateMockRecommendations,
} from "./speakingData";
import { BalanceRating } from "./speakingTypes";

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "speakers", label: "Speakers", icon: Users },
  { key: "patterns", label: "Patterns", icon: MessageSquare },
  { key: "improvements", label: "Improvements", icon: Lightbulb },
];

function getBalanceRating(score) {
  if (score >= 85) return BalanceRating.EXCELLENT;
  if (score >= 70) return BalanceRating.GOOD;
  if (score >= 45) return BalanceRating.BIASED;
  return BalanceRating.DOMINATED;
}

/* ─── Speaking Time Dashboard ──────────────────────────────────────── */
const SpeakingTimeDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Data
  const distribution = useMemo(() => generateMockSpeakingDistribution(), []);
  const trend = useMemo(() => generateMockSpeakingTrend(12), []);
  const meetingTypes = useMemo(() => generateMockMeetingTypeSpeaking(), []);
  const interruptions = useMemo(() => generateMockInterruptionMatrix(), []);
  const patterns = useMemo(() => generateMockSpeakingPatterns(), []);
  const turnSequence = useMemo(() => generateMockTurnSequence(45), []);
  const silence = useMemo(() => generateMockSilenceAnalysis(), []);
  const stats = useMemo(() => generateMockStats(), []);
  const recommendations = useMemo(() => generateMockRecommendations(), []);

  const balanceRating = getBalanceRating(stats.avgBalanceScore);
  const maxPercent = Math.max(...distribution.map((d) => d.speakingPercent));

  const totalImprovement = recommendations.reduce((sum, r) => sum + r.estimatedImprovement, 0);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <section className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="h-1 bg-linear-to-r from-violet-600 via-pink-600 to-rose-600" />
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                    <Mic className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      Speaking Time Analytics
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                      Analyze speaking patterns, balance, and participation equity
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Analysis
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8">
          <SpeakingMetricCard icon={Mic} label="Balance Score" value={`${stats.avgBalanceScore.toFixed(0)}/100`} subtitle={balanceRating} color="#8b5cf6" />
          <SpeakingMetricCard icon={Timer} label="Avg Turn Length" value={`${stats.avgTurnLength.toFixed(1)}min`} subtitle="per speaking turn" color="#0ea5e9" />
          <SpeakingMetricCard icon={Clock} label="Total Hours" value={`${stats.totalSpeakingHours.toFixed(0)}h`} subtitle="speaking analyzed" color="#22c55e" />
          <SpeakingMetricCard icon={Users} label="Participants" value={stats.avgParticipantsPerMeeting.toFixed(0)} subtitle={`avg per meeting`} color="#f59e0b" />
        </section>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <BalanceScoreCard score={stats.avgBalanceScore} rating={balanceRating} />
              </div>
              <div className="lg:col-span-2">
                <SpeakingDistributionPie data={distribution} />
              </div>
            </div>
            <BalanceTrendChart data={trend} />
            <TurnSequenceChart turns={turnSequence} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MeetingTypeComparisonChart data={meetingTypes} />
              <SilenceAnalysisChart data={silence} />
            </div>
          </div>
        )}

        {/* Tab: Speakers */}
        {activeTab === "speakers" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {distribution.map((member) => (
                <SpeakerCard key={member.id} member={member} maxPercent={maxPercent} />
              ))}
            </div>
            <InterruptionHeatmapChart data={interruptions} />
          </div>
        )}

        {/* Tab: Patterns */}
        {activeTab === "patterns" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
            <PatternRadarChart patterns={patterns} />
          </div>
        )}

        {/* Tab: Improvements */}
        {activeTab === "improvements" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Potential Balance Improvement: +{totalImprovement}%
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                AI identified {recommendations.length} opportunities to improve speaking balance and participation equity.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <SpeakingRecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-gray-700 text-center">
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Speaking Time Analytics · AI-Powered Pattern Detection · Inclusive Facilitation
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpeakingTimeDashboard;
