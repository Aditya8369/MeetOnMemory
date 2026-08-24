import React, { useState, useEffect } from "react";
import teamAvailabilityApi from "../../services/teamAvailabilityApi";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const AvailabilityPreferencesForm = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const data = await teamAvailabilityApi.getPreferences();
      setPreferences(data);
    } catch (err) {
      setError("Failed to load preferences");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await teamAvailabilityApi.updatePreferences(preferences);
      setPreferences(updated);
      alert("Preferences saved successfully!");
    } catch (err) {
      setError("Failed to save preferences");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDayChange = (index, field, value) => {
    const newWeeklyHours = [...preferences.weeklyHours];
    newWeeklyHours[index] = { ...newWeeklyHours[index], [field]: value };
    setPreferences({ ...preferences, weeklyHours: newWeeklyHours });
  };

  if (loading) return <div>Loading preferences...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!preferences) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-md max-w-2xl mx-auto text-slate-800 dark:text-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-slate-950 dark:text-white">
        Availability Preferences
      </h2>

      <form onSubmit={handleSave}>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-750 dark:text-slate-300 mb-2">
            Timezone
          </label>
          <select
            value={preferences.timezone || "UTC"}
            onChange={(e) =>
              setPreferences({ ...preferences, timezone: e.target.value })
            }
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (US & Canada)</option>
            <option value="America/Chicago">Central Time (US & Canada)</option>
            <option value="America/Denver">Mountain Time (US & Canada)</option>
            <option value="America/Los_Angeles">
              Pacific Time (US & Canada)
            </option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Asia/Calcutta">India Standard Time</option>
            {/* Add more as needed */}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-750 dark:text-slate-300 mb-2">
            Weekly Hours
          </label>
          {preferences.weeklyHours.map((dayConfig, index) => (
            <div
              key={dayConfig.dayOfWeek}
              className="flex items-center gap-4 mb-3"
            >
              <div className="w-24 font-medium text-slate-700 dark:text-slate-300">
                {DAYS[dayConfig.dayOfWeek]}
              </div>
              <input
                type="checkbox"
                checked={dayConfig.isAvailable}
                onChange={(e) =>
                  handleDayChange(index, "isAvailable", e.target.checked)
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Available</span>

              {dayConfig.isAvailable && (
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="time"
                    value={dayConfig.startTime}
                    onChange={(e) =>
                      handleDayChange(index, "startTime", e.target.value)
                    }
                    className="border border-gray-300 dark:border-gray-700 rounded p-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={dayConfig.endTime}
                    onChange={(e) =>
                      handleDayChange(index, "endTime", e.target.value)
                    }
                    className="border border-gray-300 dark:border-gray-700 rounded p-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mb-6 flex gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-750 dark:text-slate-300 mb-2">
              Daily Meeting Load Limit (Hours)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={preferences.meetingLoadLimit}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  meetingLoadLimit: Number(e.target.value),
                })
              }
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-750 dark:text-slate-300 mb-2">
              Buffer Between Meetings (Mins)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              step="5"
              value={preferences.bufferBetweenMeetings}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  bufferBetweenMeetings: Number(e.target.value),
                })
              }
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 font-semibold cursor-pointer shadow-md shadow-blue-500/10"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </div>
  );
};

export default AvailabilityPreferencesForm;
