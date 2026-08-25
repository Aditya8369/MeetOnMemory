import React, { useState, useEffect } from "react";
import api from "../../services/apiClient";

const LiveIcebreakerBanner = ({ meetingId, peers, localUserInfo }) => {
  const [icebreaker, setIcebreaker] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);

  useEffect(() => {
    // Fetch the active icebreaker for this meeting
    const fetchIcebreaker = async () => {
      try {
        const response = await api.get(`/icebreakers/meeting/${meetingId}`);
        if (response.data && response.data.icebreaker) {
          setIcebreaker(response.data.icebreaker);
        }
      } catch {
        // Ignore 404 or missing
      }
    };
    fetchIcebreaker();
  }, [meetingId]);

  if (!icebreaker) return null;

  // Compile list of all participants currently in the room
  const participants = [localUserInfo, ...peers.map((p) => p.userInfo)].filter(
    Boolean,
  );

  const currentPerson = participants[turnIndex % participants.length];

  const handleNextTurn = () => {
    setTurnIndex((prev) => prev + 1);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md p-3 px-6 flex flex-col md:flex-row items-center justify-between mx-4 mt-2 rounded-xl border border-white/20 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>

      <div className="flex items-center gap-4 z-10 w-full md:w-auto">
        <div className="bg-white/20 p-2 rounded-lg text-2xl hidden sm:block">
          🧊
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-blue-200 mb-1 block">
            Team Icebreaker • {icebreaker.category}
          </span>
          <p className="font-medium text-lg leading-snug max-w-2xl">
            {icebreaker.promptText}
          </p>
        </div>
      </div>

      {participants.length > 0 && (
        <div className="flex items-center gap-4 mt-3 md:mt-0 z-10 w-full md:w-auto justify-between md:justify-end bg-black/20 p-2 px-4 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/80">Turn:</span>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              {currentPerson?.profilePic ? (
                <img
                  src={currentPerson.profilePic}
                  className="w-5 h-5 rounded-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-400 flex items-center justify-center text-[10px] font-bold">
                  {(currentPerson?.name || "P")[0].toUpperCase()}
                </div>
              )}
              <span className="font-bold text-sm truncate max-w-[100px]">
                {currentPerson?.name || "Waiting..."}
              </span>
            </div>
          </div>
          <button
            onClick={handleNextTurn}
            className="bg-white text-indigo-700 hover:bg-blue-50 px-3 py-1 rounded shadow-sm text-xs font-bold uppercase transition-colors"
          >
            Next Person
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveIcebreakerBanner;
