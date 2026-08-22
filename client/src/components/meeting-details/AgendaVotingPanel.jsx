import React from "react";
import VoteButton from "./VoteButton";
import { ListOrdered, Lock } from "lucide-react";

export const AgendaVotingPanel = ({
  agendaItems,
  tally,
  userVotes,
  onCastVote,
  onRemoveVote,
  onAutoSort,
  isHost,
  isParticipant,
}) => {
  if (!agendaItems || agendaItems.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm transition-all duration-200">
      {/* Header Context Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Prioritize Agenda Items
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Vote on topics to determine the execution sequence and priority of
            the meeting.
          </p>
        </div>
        {isHost && (
          <button
            onClick={onAutoSort}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition duration-150 shadow-sm cursor-pointer"
            title="Sort agenda items by highest votes"
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Auto-sort by Votes
          </button>
        )}
      </div>

      {/* Authorization Notice for Non-Participants */}
      {!isParticipant && (
        <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium rounded-xl flex items-start gap-2 animate-fadeIn">
          <Lock size={15} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>Voting Restricted:</strong> You must be registered as an
            active participant of this meeting to vote on agenda items.
          </div>
        </div>
      )}

      {/* Scrollable list of items */}
      <div className="space-y-3">
        {agendaItems.map((item) => (
          <div
            key={item._id || item.id}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:shadow-sm transition duration-150"
          >
            <div className="flex-1 pr-4 min-w-0">
              <p className="text-sm text-slate-800 dark:text-slate-100 font-bold truncate">
                {item.text || item.title}
              </p>
              {item.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>

            <VoteButton
              agendaItemId={item._id || item.id}
              tally={tally[item._id || item.id]}
              userVote={userVotes[item._id || item.id]}
              onCastVote={onCastVote}
              onRemoveVote={onRemoveVote}
              isParticipant={isParticipant}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgendaVotingPanel;
