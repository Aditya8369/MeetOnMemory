import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { generateBriefing } from "../../services/briefingApi.js";

const BriefingBanner = ({ meetingId, briefingStatus, onRegenerate }) => {
  const handleGenerate = async () => {
    try {
      await generateBriefing(meetingId);
      if (onRegenerate) onRegenerate();
    } catch (error) {
      console.error("Failed to generate briefing:", error);
    }
  };

  if (briefingStatus === "generated") {
    return (
      <div className="flex items-center justify-between p-4 mb-6 rounded-xl border border-indigo-200 bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 dark:border-indigo-800">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">
              AI Pre-Meeting Briefing Available
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Context from past meetings, open action items, and knowledge
              graphs are ready.
            </p>
          </div>
        </div>
        <Link
          to={`/meetings/${meetingId}/briefing`}
          className="px-4 py-2 font-medium text-white transition-colors bg-linear-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700"
        >
          View Briefing
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 mb-6 bg-white border border-dashed rounded-xl border-slate-300 dark:bg-gray-800 dark:border-gray-600">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-gray-100">
          Prepare for this meeting
        </h3>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Generate an AI briefing summarizing related context and open action
          items.
        </p>
      </div>
      <button
        onClick={handleGenerate}
        disabled={briefingStatus === "pending"}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 transition-colors bg-white border rounded-lg border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <Sparkles className="w-4 h-4" />
        {briefingStatus === "pending" ? "Generating..." : "Generate Briefing"}
      </button>
    </div>
  );
};

export default BriefingBanner;
