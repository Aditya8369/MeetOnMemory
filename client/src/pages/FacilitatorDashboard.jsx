import React, { useState } from "react";
import { PlayCircle, SkipForward, AlertCircle, Clock } from "lucide-react";

const FacilitatorDashboard = ({
  meeting,
  onAdvanceAgenda,
  onNudgeParticipant,
}) => {
  const [currentAgendaIndex, setCurrentAgendaIndex] = useState(0);

  const handleAdvance = () => {
    if (currentAgendaIndex < meeting.agendaItems.length - 1) {
      setCurrentAgendaIndex((prev) => prev + 1);
      if (onAdvanceAgenda) onAdvanceAgenda(currentAgendaIndex + 1);
    }
  };

  const currentItem = meeting.agendaItems[currentAgendaIndex];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-6">
      <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <span className="text-amber-400 mr-3">👑</span> Facilitator
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1">{meeting.title}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center border border-slate-700">
            <Clock className="w-5 h-5 text-blue-400 mr-2" />
            <span className="font-mono text-lg">Pacing: On Track</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1">
        {/* Agenda Control Panel */}
        <div className="col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">
            Live Agenda Control
          </h2>

          {currentItem ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-slate-700/50 rounded-xl border border-slate-600 mb-6">
              <span className="text-blue-400 font-medium mb-2 uppercase tracking-wider text-sm">
                Current Item ({currentAgendaIndex + 1} of{" "}
                {meeting.agendaItems.length})
              </span>
              <h3 className="text-3xl font-bold mb-4">{currentItem.text}</h3>
              <p className="text-slate-400 mb-8 max-w-lg">
                {currentItem.description || "No description provided."}
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleAdvance}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center transition-colors"
                >
                  <SkipForward className="w-5 h-5 mr-2" />
                  Advance to Next Item
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Agenda completed.
            </div>
          )}

          <div className="bg-slate-900 rounded-lg p-4 max-h-48 overflow-y-auto">
            <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
              Upcoming Items
            </h4>
            <div className="space-y-2">
              {meeting.agendaItems
                .slice(currentAgendaIndex + 1)
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-slate-800 rounded border border-slate-700 opacity-70"
                  >
                    <span className="truncate">{item.text}</span>
                    <span className="text-sm text-slate-400">
                      {item.duration}m
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Participant Management */}
        <div className="col-span-1 bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">
            Participant Controls
          </h2>
          <div className="space-y-3">
            {meeting.participants.map((p) => (
              <div
                key={p.user}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-medium border border-blue-500/30">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-200">
                      {p.name}
                    </p>
                    {p.role && (
                      <p className="text-xs text-slate-400">{p.role}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onNudgeParticipant && onNudgeParticipant(p.user)
                  }
                  className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                  title="Nudge Participant (Off-topic)"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilitatorDashboard;
