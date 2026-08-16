import React from "react";
import VoteButton from "./VoteButton";
import { ListOrdered } from "lucide-react";

export const AgendaVotingPanel = ({
  agendaItems,
  tally,
  userVotes,
  onCastVote,
  onRemoveVote,
  onAutoSort,
  isHost,
}) => {
  if (!agendaItems || agendaItems.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">
          Prioritize Agenda Items
        </h3>
        {isHost && (
          <button
            onClick={onAutoSort}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
            title="Sort agenda items by highest votes"
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Auto-sort by Votes
          </button>
        )}
      </div>

      <div className="space-y-2">
        {agendaItems.map((item) => (
          <div
            key={item._id || item.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100"
          >
            <div className="flex-1 pr-4">
              <p className="text-sm text-gray-800 font-medium">
                {item.text || item.title}
              </p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
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
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgendaVotingPanel;
