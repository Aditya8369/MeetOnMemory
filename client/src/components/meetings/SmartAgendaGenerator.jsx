import React, { useCallback, useEffect, useState } from "react";
import {
  generateAgendaSuggestions,
  updateSuggestionItemStatus,
  applySuggestionToMeeting,
  getMeetingSuggestions,
} from "../../services/agendaSuggestionApi";
import {
  Sparkles,
  Check,
  Edit2,
  X,
  RotateCcw,
  AlertCircle,
  Clock,
  Tag,
  HelpCircle,
} from "lucide-react";

const SmartAgendaGenerator = ({
  organizationId,
  meetingId,
  currentAgenda = [],
  onApplySuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editText, setEditText] = useState("");
  const [errorText, setErrorText] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [previousAgendaBackup, setPreviousAgendaBackup] = useState(null);
  const [showConfirmApply, setShowConfirmApply] = useState(false);

  const loadExistingSuggestions = useCallback(async () => {
    try {
      const data = await getMeetingSuggestions(meetingId);
      if (data && data.length > 0) {
        setSuggestions(data[0]); // Load the most recent generation
      }
    } catch (error) {
      console.error("Failed to load existing suggestions:", error);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) {
      loadExistingSuggestions();
    }
  }, [loadExistingSuggestions, meetingId]);

  const handleGenerate = async () => {
    setLoading(true);
    setErrorText(null);
    setSuggestions(null);
    try {
      const data = await generateAgendaSuggestions(organizationId, meetingId);
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to generate agenda:", error);
      setErrorText(
        error.response?.data?.message ||
          error.message ||
          "Error generating agenda suggestions.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (itemId, status, text = null) => {
    if (!suggestions) return;
    setErrorText(null);
    try {
      const updated = await updateSuggestionItemStatus(
        suggestions._id,
        itemId,
        status,
        text,
      );
      setSuggestions(updated);
      setEditingItemId(null);
    } catch (error) {
      console.error("Failed to update status:", error);
      setErrorText(
        error.response?.data?.message ||
          error.message ||
          "Failed to update status.",
      );
    }
  };

  const handleApplyClick = () => {
    if (!suggestions) return;

    const itemsToApply = suggestions.suggestions.filter(
      (s) => s.status === "accepted" || s.status === "edited",
    );

    if (itemsToApply.length === 0) {
      setErrorText(
        "Please accept or edit at least one suggestion before applying to the agenda.",
      );
      return;
    }

    if (currentAgenda && currentAgenda.length > 0) {
      setShowConfirmApply(true);
    } else {
      handleApply("replace");
    }
  };

  const handleApply = async (applyMode) => {
    if (!suggestions) return;
    setErrorText(null);
    try {
      if (meetingId) {
        await applySuggestionToMeeting(suggestions._id, meetingId);
      }

      const itemsToApply = suggestions.suggestions.filter(
        (s) => s.status === "accepted" || s.status === "edited",
      );

      const formattedItems = itemsToApply.map((i) => ({
        text: i.status === "edited" ? i.acceptedText : i.text,
        description: i.description || "",
        duration: i.estimatedDuration || 15,
        id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      }));

      // Backup previous agenda
      setPreviousAgendaBackup([...currentAgenda]);

      let updatedAgenda;
      if (applyMode === "append") {
        updatedAgenda = [...currentAgenda, ...formattedItems];
      } else {
        updatedAgenda = formattedItems;
      }

      if (onApplySuccess) {
        onApplySuccess(updatedAgenda);
      }

      setShowConfirmApply(false);
      setToastMessage(
        "AI Suggestions successfully applied to your meeting timeline.",
      );
      setTimeout(() => setToastMessage(null), 8000);
    } catch (error) {
      console.error("Failed to apply suggestions:", error);
      setErrorText(
        error.response?.data?.message ||
          error.message ||
          "Error applying agenda suggestions.",
      );
    }
  };

  const handleUndoApply = () => {
    if (previousAgendaBackup) {
      if (onApplySuccess) {
        onApplySuccess(previousAgendaBackup);
      }
      setPreviousAgendaBackup(null);
      setToastMessage("Changes reverted. Previous agenda restored.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Smart Agenda Builder
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Synthesize structured meeting timelines with AI acceleration.
            </p>
          </div>
        </div>
        {suggestions && !loading && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            type="button"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            Regenerate
          </button>
        )}
      </div>

      {/* Floating System Custom Toast Notifications Block */}
      {toastMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-between gap-4 animate-slideDown shadow-sm">
          <span className="flex items-center gap-2">🎉 {toastMessage}</span>
          {previousAgendaBackup && (
            <button
              onClick={handleUndoApply}
              type="button"
              className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1.5 cursor-pointer underline hover:no-underline"
            >
              <RotateCcw size={12} /> Undo
            </button>
          )}
        </div>
      )}

      {/* Error Alert Display Box */}
      {errorText && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Generation Error:</strong> {errorText}
          </div>
          <button
            type="button"
            onClick={() => setErrorText(null)}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Loading Skeletons State During AI Requests */}
      {loading && (
        <div className="space-y-4 py-2 animate-pulse">
          <div className="text-center py-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Analyzing organization context (action items, decisions, and
            follow-ups)...
          </div>
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex justify-between items-center"
            >
              <div className="space-y-2 w-2/3">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12" />
            </div>
          ))}
        </div>
      )}

      {/* Empty / Failure Actionable States Case Container */}
      {!loading && !suggestions && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
            <Sparkles
              className="text-slate-400 dark:text-slate-500"
              size={24}
            />
          </div>
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">
            No Suggestions Generated Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-normal">
            Synthesize a draft agenda tailored to open action items, deferred
            decisions, and recent topics from your organization.
          </p>
          <button
            onClick={handleGenerate}
            type="button"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm cursor-pointer"
          >
            ⚡ Generate Suggestions
          </button>
        </div>
      )}

      {/* Confirm Apply Options Dialog */}
      {showConfirmApply && (
        <div className="mb-6 p-4 border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
            <HelpCircle size={14} className="text-indigo-500" /> Apply Option
            Confirmation
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            You already have items in your current meeting agenda. How would you
            like to apply these suggestions?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleApply("replace")}
              type="button"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Replace Existing
            </button>
            <button
              onClick={() => handleApply("append")}
              type="button"
              className="px-4 py-2 bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Append to Existing
            </button>
            <button
              onClick={() => setShowConfirmApply(false)}
              type="button"
              className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Populated Suggestion Item Stream Deck */}
      {!loading && suggestions && (
        <div className="space-y-4">
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {suggestions.suggestions.map((item) => {
              const isAccepted =
                item.status === "accepted" || item.status === "edited";
              const isRejected = item.status === "rejected";
              const isEditing = editingItemId === item._id;

              return (
                <div
                  key={item._id}
                  className={`p-3.5 border rounded-xl flex flex-col gap-2 transition duration-150 ${
                    isAccepted
                      ? "border-emerald-250 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : isRejected
                        ? "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-60"
                        : "border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(item._id, "edited", editText)
                          }
                          className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                          {item.status === "edited"
                            ? item.acceptedText
                            : item.text}
                        </h4>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.status === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(item._id, "accepted")
                                }
                                className="p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                                title="Accept"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item._id);
                                  setEditText(item.text);
                                }}
                                className="p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(item._id, "rejected")
                                }
                                className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-955/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(item._id, "pending")
                              }
                              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={11} /> Undo
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium">
                          <Clock size={12} /> {item.estimatedDuration} min
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-full font-semibold text-[10px]">
                          <Tag size={10} />{" "}
                          {item.source?.title || "AI Suggestion"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleApplyClick}
              disabled={suggestions.appliedAt !== null}
              type="button"
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition duration-150 cursor-pointer"
            >
              {suggestions.appliedAt !== null
                ? "Applied to Meeting"
                : "📋 Apply Suggestions to Agenda"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAgendaGenerator;
