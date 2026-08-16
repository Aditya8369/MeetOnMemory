import React, { useState } from "react";
import { schedulerApi } from "../../services/schedulerApi";
import AvailabilityGrid from "./AvailabilityGrid";

/**
 * Multi-step wizard for scheduling meetings via Smart Scheduler (#1530).
 * Collects title, duration, date range, and preferences; confirms with proposal ID.
 */
const SchedulerWizard = ({ onClose, onScheduled }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proposalId, setProposalId] = useState(null);

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

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await schedulerApi.createProposal(formData);
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
      onScheduled?.();
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to confirm meeting",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Smart Scheduler {step > 1 ? `(Step ${step}/3)` : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 dark:text-gray-300"
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
            <div className="space-y-4">
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g., Q3 Planning Session"
                />
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

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Participant selection uses your organization roster. Pass
                participant IDs via integrations or leave empty to schedule for
                yourself after selecting team members in a future step.
              </p>

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
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulerWizard;
