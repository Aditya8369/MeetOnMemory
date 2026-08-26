import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { getBriefing, generateBriefing } from "../services/briefingApi.js";
import Navbar from "../components/Navbar";

const MeetingBriefing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const data = await getBriefing(id);
        setBriefing(data);
      } catch (error) {
        console.error("Failed to load briefing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [id]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await generateBriefing(id);

      // Since it's async, we just poll once after a delay
      setTimeout(async () => {
        try {
          const data = await getBriefing(id);
          setBriefing(data);
        } catch (err) {
          console.error("Failed to fetch regenerated briefing:", err);
        } finally {
          setLoading(false);
          setRegenerating(false);
        }
      }, 3000);
    } catch (error) {
      console.error("Failed to regenerate briefing:", error);
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
        <Navbar />
        <div className="flex justify-center items-center h-64 mt-10">
          <div className="w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!briefing || briefing.status === "failed") {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
        <Navbar />
        <div className="max-w-4xl px-4 py-8 mx-auto mt-4">
          <button
            onClick={() => navigate(`/meeting/${id}`)}
            className="flex items-center gap-2 mb-4 text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Meeting
          </button>
          <div className="p-8 text-center bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Briefing Unavailable
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              The AI briefing for this meeting has not been generated or failed
              to generate.
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 px-4 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {regenerating ? "Generating..." : "Generate Briefing"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />
      <div className="max-w-4xl px-4 py-8 mx-auto mt-4 mb-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/meeting/${id}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Meeting
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border border-gray-300 rounded-lg text-slate-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Sparkles className="w-4 h-4" />
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-lg rounded-2xl md:p-8 dark:bg-gray-800 dark:border-gray-700 shadow-slate-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center p-3 text-white rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl dark:text-white">
              Pre-Meeting Briefing
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Executive Summary
            </h2>
            <p className="leading-relaxed text-gray-700 whitespace-pre-line dark:text-gray-300">
              {briefing.executiveSummary}
            </p>
          </div>

          <hr className="my-8 border-gray-200 dark:border-gray-700" />

          {briefing.suggestedQuestions &&
            briefing.suggestedQuestions.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Suggested Strategic Questions
                </h2>
                <ul className="space-y-3">
                  {briefing.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 mt-0.5 text-indigo-500 shrink-0" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {q}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {(briefing.openActionItems?.length > 0 ||
            briefing.relatedPastMeetings?.length > 0) && (
            <hr className="my-8 border-gray-200 dark:border-gray-700" />
          )}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {briefing.openActionItems &&
              briefing.openActionItems.length > 0 && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Pending Action Items
                  </h2>
                  <ul className="space-y-4">
                    {briefing.openActionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 mt-0.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.text}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Owner: {item.owner}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {briefing.relatedPastMeetings &&
              briefing.relatedPastMeetings.length > 0 && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Related Past Context
                  </h2>
                  <ul className="space-y-4">
                    {briefing.relatedPastMeetings.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 mt-0.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {m.title}
                          </p>
                          {m.summary && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {m.summary.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingBriefing;
