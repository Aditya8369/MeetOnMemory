import React from "react";
import { useIcebreakers } from "../../hooks/useIcebreakers";
import IcebreakerWidget from "./IcebreakerWidget";

const IcebreakerSection = ({ meetingId }) => {
  const { icebreakers, loading, selectedIcebreaker, generate, select } =
    useIcebreakers(meetingId);

  return (
    <div className="mb-6 bg-cyan-50/50 dark:bg-cyan-950/30 p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/50">
      <div className="flex justify-between items-center mb-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-cyan-900 dark:text-cyan-300">
          🧊 Team Icebreaker
        </label>
        <button
          type="button"
          onClick={() => generate()}
          disabled={loading}
          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Icebreaker"}
        </button>
      </div>
      <p className="text-xs text-cyan-700 dark:text-cyan-400 mb-3">
        Start the meeting on a high note by generating context-aware icebreakers
        based on the participants.
      </p>
      <IcebreakerWidget
        icebreakers={icebreakers}
        loading={loading}
        onSelect={select}
        selectedIcebreaker={selectedIcebreaker}
      />
    </div>
  );
};

export default IcebreakerSection;
