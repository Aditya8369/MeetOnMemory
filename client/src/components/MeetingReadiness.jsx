import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getMeetingReadiness } from "../api/meetingNudgeApi";
import { meetingChecklistApi } from "../services/meetingChecklistApi";
import meetingRsvpApi from "../services/meetingRsvpApi";
import {
  CheckCircle2,
  FileText,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from "lucide-react";

const MeetingReadiness = ({ meetingId, meeting, briefingStatus }) => {
  const [readiness, setReadiness] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [rsvpSummary, setRsvpSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchAllReadinessSignals = async () => {
      try {
        setLoading(true);
        const [readinessData, checklistRes, rsvpRes] = await Promise.allSettled(
          [
            getMeetingReadiness(meetingId),
            meetingChecklistApi.getChecklist(meetingId),
            meetingRsvpApi.getMeetingSummary(meetingId),
          ],
        );

        if (!isMounted) return;

        if (
          readinessData.status === "fulfilled" &&
          readinessData.value?.averageScore !== undefined
        ) {
          setReadiness(readinessData.value);
        }
        if (
          checklistRes.status === "fulfilled" &&
          checklistRes.value?.data?.data?.checklist
        ) {
          setChecklist(checklistRes.value.data.data.checklist);
        }
        if (
          rsvpRes.status === "fulfilled" &&
          rsvpRes.value?.data?.data?.summary
        ) {
          setRsvpSummary(rsvpRes.value.data.data.summary);
        }
      } catch (err) {
        console.error("Failed to fetch meeting readiness signals", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (meetingId) {
      fetchAllReadinessSignals();
    }

    return () => {
      isMounted = false;
    };
  }, [meetingId]);

  // Aggregate multidimensional readiness indicators
  const stats = useMemo(() => {
    // 1. Checklist readiness
    const totalChecklistItems = checklist?.items?.length || 0;
    const completedChecklistCount = checklist?.completions?.length || 0;
    const checklistProgress =
      totalChecklistItems > 0
        ? Math.min(
            100,
            Math.round(
              (completedChecklistCount /
                (totalChecklistItems *
                  Math.max(1, meeting?.participants?.length || 1))) *
                100,
            ),
          )
        : 100;

    // 2. RSVP confirmation readiness
    const totalParticipants = meeting?.participants?.length || 0;
    const acceptedCount = rsvpSummary?.accepted || 0;
    const rsvpRate =
      totalParticipants > 0
        ? Math.round((acceptedCount / totalParticipants) * 100)
        : 100;

    // 3. Agenda & Briefing preparedness
    const hasAgenda = (meeting?.agendaItems?.length || 0) > 0;
    const hasBriefing =
      briefingStatus === "generated" || meeting?.briefingStatus === "generated";

    // 4. Base participant average score
    const baseScore = readiness?.averageScore ?? 85;

    // Composite Cockpit Score calculation
    let compositeScore = baseScore;
    if (totalChecklistItems > 0) {
      compositeScore = Math.round(
        compositeScore * 0.6 + checklistProgress * 0.4,
      );
    }
    if (totalParticipants > 0 && rsvpSummary) {
      compositeScore = Math.round(compositeScore * 0.8 + rsvpRate * 0.2);
    }

    return {
      compositeScore: Math.min(100, Math.max(0, compositeScore)),
      totalChecklistItems,
      completedChecklistCount,
      checklistProgress,
      totalParticipants,
      acceptedCount,
      rsvpRate,
      hasAgenda,
      agendaCount: meeting?.agendaItems?.length || 0,
      hasBriefing,
      participantScores: readiness?.participants || [],
    };
  }, [readiness, checklist, rsvpSummary, meeting, briefingStatus]);

  if (loading) {
    return (
      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 w-64 bg-gray-100 dark:bg-gray-700/60 rounded"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      </div>
    );
  }

  // Determine readiness status theme
  const getScoreColor = (score) => {
    if (score >= 80)
      return "text-emerald-600 dark:text-emerald-400 stroke-emerald-500";
    if (score >= 60) return "text-blue-600 dark:text-blue-400 stroke-blue-500";
    if (score >= 40)
      return "text-amber-600 dark:text-amber-400 stroke-amber-500";
    return "text-red-600 dark:text-red-400 stroke-red-500";
  };

  const getScoreBadge = (score) => {
    if (score >= 80)
      return {
        label: "Ready to Launch",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    if (score >= 60)
      return {
        label: "Moderate Readiness",
        bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
      };
    if (score >= 40)
      return {
        label: "Prep Needed",
        bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    return {
      label: "Low Readiness",
      bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    };
  };

  const badge = getScoreBadge(stats.compositeScore);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200">
      {/* Header & Cockpit Gauge */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Pre-Meeting Readiness Cockpit
                </h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
                Live multi-factor preparation tracking synthesized from agenda
                items, participant tasks, AI briefing status, and confirmed
                RSVPs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end md:self-center">
            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-gray-100 dark:text-gray-700"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className={`transition-all duration-1000 ease-out ${getScoreColor(stats.compositeScore)}`}
                  strokeDasharray={`${stats.compositeScore}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                  {stats.compositeScore}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
            >
              {expanded ? (
                <>
                  <span>Less Details</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Deep Signals</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Multi-Factor Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {/* 1. Agenda Items */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                stats.hasAgenda
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Agenda Topics
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {stats.agendaCount > 0
                  ? `${stats.agendaCount} Structured Items`
                  : "No Agenda Set"}
              </p>
            </div>
          </div>

          {/* 2. Prep Checklist */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                stats.totalChecklistItems > 0
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Checklist Tasks
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {stats.totalChecklistItems > 0
                  ? `${stats.completedChecklistCount} done (${stats.checklistProgress}%)`
                  : "No Prep Tasks"}
              </p>
            </div>
          </div>

          {/* 3. AI Pre-Briefing */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                stats.hasBriefing
                  ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                AI Synthesis
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                  {stats.hasBriefing ? "Briefing Ready" : "Unbriefed"}
                </p>
                {stats.hasBriefing && (
                  <Link
                    to={`/meetings/${meetingId}/briefing`}
                    className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 4. RSVP Confirmation */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                stats.acceptedCount > 0
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                RSVP Attendance
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {stats.totalParticipants > 0
                  ? `${stats.acceptedCount}/${stats.totalParticipants} Confirmed`
                  : "0 Registered"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Deep Signals Drawer */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-850 p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            Participant Preparation Breakdown
          </h4>

          {stats.participantScores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.participantScores.map((p, idx) => {
                const pScore = p.score ?? 100;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs shrink-0">
                        {p.user?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {p.user?.name || "Attendee"}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                          {p.context?.hasViewedAgenda
                            ? "Agenda reviewed"
                            : "Agenda pending review"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.context?.unresolvedCount > 0 && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                          {p.context.unresolvedCount} pending items
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          pScore >= 80
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : pScore >= 60
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        }`}
                      >
                        {pScore}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl text-center text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700">
              No individual participant readiness data yet. Nudges will evaluate
              attendee tasks 24h before meeting kickoff.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingReadiness;
