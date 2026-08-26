import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export const VoteButton = ({
  agendaItemId,
  tally = 0,
  userVote,
  onCastVote,
  onRemoveVote,
  isParticipant = true,
}) => {
  const handleUpvote = () => {
    if (!isParticipant) return;
    if (userVote === 1) {
      onRemoveVote(agendaItemId);
    } else {
      onCastVote(agendaItemId, 1);
    }
  };

  const handleDownvote = () => {
    if (!isParticipant) return;
    if (userVote === -1) {
      onRemoveVote(agendaItemId);
    } else {
      onCastVote(agendaItemId, -1);
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0">
      <button
        onClick={handleUpvote}
        disabled={!isParticipant}
        className={`h-10 w-10 flex items-center justify-center rounded-xl transition duration-150 ${
          userVote === 1
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40"
            : !isParticipant
              ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 border border-transparent"
        }`}
        title={
          !isParticipant ? "Voting is restricted to participants" : "Upvote"
        }
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      <span className="font-mono font-bold text-sm min-w-[2ch] text-center text-slate-700 dark:text-slate-350">
        {tally}
      </span>

      <button
        onClick={handleDownvote}
        disabled={!isParticipant}
        className={`h-10 w-10 flex items-center justify-center rounded-xl transition duration-150 ${
          userVote === -1
            ? "text-rose-600 bg-rose-50 dark:bg-rose-955/30 border border-rose-200 dark:border-rose-900/40"
            : !isParticipant
              ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-450 border border-transparent"
        }`}
        title={
          !isParticipant ? "Voting is restricted to participants" : "Downvote"
        }
      >
        <ArrowDown className="w-5 h-5" />
      </button>
    </div>
  );
};

export default VoteButton;
