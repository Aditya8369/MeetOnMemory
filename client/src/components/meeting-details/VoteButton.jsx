import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export const VoteButton = ({
  agendaItemId,
  tally,
  userVote,
  onCastVote,
  onRemoveVote,
}) => {
  const handleUpvote = () => {
    if (userVote === 1) {
      onRemoveVote(agendaItemId);
    } else {
      onCastVote(agendaItemId, 1);
    }
  };

  const handleDownvote = () => {
    if (userVote === -1) {
      onRemoveVote(agendaItemId);
    } else {
      onCastVote(agendaItemId, -1);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <button
        onClick={handleUpvote}
        className={`p-1 rounded transition-colors ${
          userVote === 1
            ? "text-blue-600 bg-blue-50"
            : "hover:bg-gray-100 text-gray-400 hover:text-blue-500"
        }`}
        title="Upvote"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      <span className="font-medium min-w-[1ch] text-center text-gray-700">
        {tally || 0}
      </span>

      <button
        onClick={handleDownvote}
        className={`p-1 rounded transition-colors ${
          userVote === -1
            ? "text-red-600 bg-red-50"
            : "hover:bg-gray-100 text-gray-400 hover:text-red-500"
        }`}
        title="Downvote"
      >
        <ArrowDown className="w-4 h-4" />
      </button>
    </div>
  );
};

export default VoteButton;
