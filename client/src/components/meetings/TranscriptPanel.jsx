import React, { useState } from "react";
import { FileText, X, Captions, Languages } from "lucide-react";
import MultiLanguageTranscript from "../meeting-room/MultiLanguageTranscript.jsx";

export default function TranscriptPanel({
  showTranscript,
  onClose,
  transcriptSegments = [],
  meetingId,
}) {
  const [activeTab, setActiveTab] = useState("translations"); // "translations" | "raw"

  if (!showTranscript) return null;

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      data-testid="meeting-room-transcript-panel"
      className="w-full md:w-[420px] lg:w-[480px] shrink-0 p-4 bg-gray-950 border-l border-gray-800 overflow-y-auto flex flex-col transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("translations")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "translations"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-300 hover:text-white"
            }`}
          >
            <Languages size={14} />
            Translations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "raw"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-300 hover:text-white"
            }`}
          >
            <FileText size={14} />
            Raw Stream
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close transcript panel"
        >
          <X size={20} />
        </button>
      </div>

      {activeTab === "translations" ? (
        <MultiLanguageTranscript meetingId={meetingId} />
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {transcriptSegments.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <Captions size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transcript yet</p>
              <p className="text-xs mt-1">
                Enable captions to start transcription
              </p>
            </div>
          ) : (
            transcriptSegments.map((segment, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-indigo-400 text-sm font-medium">
                    {segment.speaker || "Speaker"}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {formatTimestamp(segment.startTime)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{segment.text}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
