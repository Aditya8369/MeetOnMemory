import React, { useState } from "react";
import api from "../../services/api";
import AvailabilityGrid from "./AvailabilityGrid";

/**
 * @desc Multi-step wizard for scheduling meetings. Collects participants,
 * duration, date range, and preferences before triggering the AI scheduler.
 */
const SchedulerWizard = ({ onClose, onScheduled }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    participantIds: [], // Assume user selector component populates this
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
      const { data } = await api.post("/scheduler/propose", formData);
      setProposals(data.data.proposedSlots);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate proposals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (slot) => {
    setIsLoading(true);
    try {
      // Assuming we have a proposal ID stored in state after generation
      // For simplicity, we'll just call the confirm endpoint
      await api.put(`/scheduler/propose/confirm`, {
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      onScheduled();
      onClose();
    } catch {
      setError("Failed to confirm meeting");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Smart Scheduler {step > 1 ? `(Step ${step}/3)` : ""}
          </h2>
          <button onClick={onClose} className="text-sm text-gray-600">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="e.g., Q3 Planning Session"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[15, 30, 45, 60].map((min) => (
                    <button
                      key={min}
                      onClick={() =>
                        setFormData({ ...formData, duration: min })
                      }
                      className={`rounded-md py-2 text-sm font-medium ${
                        formData.duration === min
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <button
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
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
                  <span className="text-gray-900">Avoid weekends</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-md border border-gray-300 py-2 font-medium text-gray-700"
                >
                  Back
                </button>
                <button
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
