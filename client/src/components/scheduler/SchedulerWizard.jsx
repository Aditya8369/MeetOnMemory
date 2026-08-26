import React, { useState, useEffect } from "react";
import { schedulerApi } from "../../services/schedulerApi";
import { organizationApi } from "../../services/organizationApi";
import AvailabilityGrid from "./AvailabilityGrid";
import { Users, Search, X, Check, UserCheck, Sparkles } from "lucide-react";

/**
 * Multi-step wizard for scheduling meetings via Smart Scheduler (#1530, #1897).
 * Collects title, participants, duration, date range, and preferences; confirms or hands off with proposal.
 */
const SchedulerWizard = ({ onClose, onScheduled, onHandoff }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proposalId, setProposalId] = useState(null);

  // Organization members state
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    participantIds: [],
    duration: 30,
    dateRange: {
      start: new Date().toISOString().split("T")[0],
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
    preferences: {
      avoidWeekends: true,
      preferredTimes: ["morning", "afternoon"],
    },
  });

  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMembers(true);
    organizationApi
      .getMembers()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      })
      .catch((err) => {
        console.error("Failed to load organization members:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleParticipant = (memberId) => {
    setFormData((prev) => {
      const exists = prev.participantIds.includes(memberId);
      return {
        ...prev,
        participantIds: exists
          ? prev.participantIds.filter((id) => id !== memberId)
          : [...prev.participantIds, memberId],
      };
    });
  };

  const selectAllMembers = () => {
    const allIds = members
      .map((m) => m._id || m.id || m.userId)
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      participantIds: allIds,
    }));
  };

  const clearParticipants = () => {
    setFormData((prev) => ({
      ...prev,
      participantIds: [],
    }));
  };

  const filteredMembers = members.filter((m) => {
    const term = memberSearch.toLowerCase();
    const name = (m.name || m.user?.name || "").toLowerCase();
    const email = (m.email || m.user?.email || "").toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const selectedMembers = members.filter((m) => {
    const id = m._id || m.id || m.userId;
    return formData.participantIds.includes(id);
  });

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await schedulerApi.createProposal({
        ...formData,
        participantIds: formData.participantIds,
      });
      if (!data?.success || !data?.data) {
        throw new Error(data?.error || "Failed to generate proposals");
      }
      setProposalId(data.data._id);
      setProposals(data.data.proposedSlots || []);
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to generate proposals",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (slot) => {
    if (!proposalId) {
      setError("Missing proposal ID. Generate proposals again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await schedulerApi.confirmProposal(proposalId, {
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      onScheduled?.({
        proposalId,
        slot,
        participants: selectedMembers,
      });
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to confirm meeting",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandoff = (slot) => {
    const startDateObj = new Date(slot.startTime);
    const slotDate = startDateObj.toISOString().split("T")[0];
    const hours = startDateObj.getHours().toString().padStart(2, "0");
    const minutes = startDateObj.getMinutes().toString().padStart(2, "0");
    const slotTime = `${hours}:${minutes}`;

    const handoffPayload = {
      title: formData.title,
      duration: formData.duration,
      date: slotDate,
      time: slotTime,
      participants: selectedMembers.map((m, idx) => ({
        name: m.name || m.user?.name || m.email || "Member",
        email: m.email || m.user?.email || "",
        id: m._id || m.id || m.userId || `part-${idx}`,
      })),
      proposalId,
      selectedSlot: slot,
    };

    if (onHandoff) {
      onHandoff(handoffPayload);
    } else {
      onScheduled?.(handoffPayload);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Smart Scheduler {step > 1 ? `(Step ${step}/3)` : ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Q3 Planning Session"
                />
              </div>

              {/* Organization Member Picker */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-slate-800/60">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Select Team Participants
                    </label>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {formData.participantIds.length} selected
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllMembers}
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                    >
                      Select All
                    </button>
                    {formData.participantIds.length > 0 && (
                      <>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={clearParticipants}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Selected Participant Chips */}
                {selectedMembers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {selectedMembers.map((m) => {
                      const id = m._id || m.id || m.userId;
                      const name = m.name || m.user?.name || m.email;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200"
                        >
                          <UserCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          {name}
                          <button
                            type="button"
                            onClick={() => toggleParticipant(id)}
                            className="ml-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400"
                            aria-label={`Remove ${name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search organization members by name or email..."
                    className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Members List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
                  {loadingMembers ? (
                    <p className="py-4 text-center text-xs text-gray-500">
                      Loading team members...
                    </p>
                  ) : filteredMembers.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-500">
                      No team members found
                    </p>
                  ) : (
                    filteredMembers.map((member) => {
                      const id = member._id || member.id || member.userId;
                      const isSelected = formData.participantIds.includes(id);
                      const name = member.name || member.user?.name || "Member";
                      const email = member.email || member.user?.email || "";
                      const role = member.role || "Member";

                      return (
                        <div
                          key={id}
                          onClick={() => toggleParticipant(id)}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800"
                              : "hover:bg-gray-100 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-900 dark:text-white">
                                {name}
                              </p>
                              {email && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {email}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 capitalize bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {role}
                            </span>
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[15, 30, 45, 60].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, duration: min })
                      }
                      className={`rounded-md py-2 text-sm font-medium ${
                        formData.duration === min
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200"
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.dateRange.start}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dateRange: {
                          ...formData.dateRange,
                          start: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.dateRange.end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dateRange: {
                          ...formData.dateRange,
                          end: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.title}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next: Preferences
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preferences
                </label>
                <label className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.preferences.avoidWeekends}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          avoidWeekends: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <span className="text-gray-900 dark:text-gray-100">
                    Avoid weekends
                  </span>
                </label>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300">
                <span className="font-semibold">Scheduling summary:</span>{" "}
                Analyzing optimal slots for <strong>{formData.title}</strong> (
                {formData.duration} min) across{" "}
                <strong>{formData.participantIds.length}</strong> selected team
                participant{formData.participantIds.length === 1 ? "" : "s"}.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-md border border-gray-300 py-2 font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? "Analyzing Calendars..." : "Find Optimal Times"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <AvailabilityGrid
              proposals={proposals}
              onConfirm={handleConfirm}
              onHandoff={handleHandoff}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulerWizard;
