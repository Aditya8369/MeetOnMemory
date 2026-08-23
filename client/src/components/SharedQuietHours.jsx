import React, { useState, useEffect } from "react";
import { notificationApi } from "../services/notificationApi.js";
import { toast } from "react-toastify";

const formatHour = (hour) => {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
};

const SharedQuietHours = ({ onQuietHoursChange }) => {
  const [preferences, setPreferences] = useState({
    quietHoursStart: "",
    quietHoursEnd: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [loading, setLoading] = useState(true);

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    fetchQuietHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuietHours = async () => {
    try {
      const { data } = await notificationApi.getPreferences();
      const pref = data.preferences || {};
      const loadedPref = {
        quietHoursStart:
          pref.quietHoursStart !== undefined && pref.quietHoursStart !== null
            ? String(pref.quietHoursStart)
            : "",
        quietHoursEnd:
          pref.quietHoursEnd !== undefined && pref.quietHoursEnd !== null
            ? String(pref.quietHoursEnd)
            : "",
        timezone:
          pref.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "UTC",
      };
      setPreferences(loadedPref);
      if (onQuietHoursChange) {
        onQuietHoursChange(loadedPref);
      }
    } catch (err) {
      console.error("Failed to load quiet hours:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    const nextPrefs = {
      ...preferences,
      [name]: value,
    };
    setPreferences(nextPrefs);

    // Save quiet hours preference
    try {
      const payload = {
        quietHoursStart:
          nextPrefs.quietHoursStart !== ""
            ? Number(nextPrefs.quietHoursStart)
            : null,
        quietHoursEnd:
          nextPrefs.quietHoursEnd !== ""
            ? Number(nextPrefs.quietHoursEnd)
            : null,
        timezone: nextPrefs.timezone,
      };
      await notificationApi.updatePreferences(payload);
      if (onQuietHoursChange) {
        onQuietHoursChange(payload);
      }
    } catch (err) {
      console.error("Failed to update quiet hours:", err);
      toast.error("Failed to update quiet hours");
    }
  };

  const getNextSendPreview = () => {
    const {
      quietHoursStart: start,
      quietHoursEnd: end,
      timezone,
    } = preferences;
    if (start === "" || end === "") {
      return "Emails will be sent immediately / as scheduled.";
    }

    const startNum = Number(start);
    const endNum = Number(end);
    const now = new Date();

    let currentHour;
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "UTC",
        hour: "numeric",
        hour12: false,
      });
      currentHour = parseInt(formatter.format(now), 10);
    } catch {
      currentHour = now.getHours();
    }

    let inQuietHours = false;
    if (startNum < endNum) {
      inQuietHours = currentHour >= startNum && currentHour < endNum;
    } else {
      inQuietHours = currentHour >= startNum || currentHour < endNum;
    }

    if (inQuietHours) {
      return `Quiet Hours are active. Scheduled digests, recaps, and reminders will be deferred until after ${formatHour(endNum)}.`;
    }
    return `Quiet Hours are inactive. Next pings/emails will send as scheduled (Quiet Hours active ${formatHour(startNum)} - ${formatHour(endNum)}).`;
  };

  if (loading) {
    return (
      <div className="text-slate-500 text-sm">
        Loading quiet hours settings...
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-indigo-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
          Unified Quiet Hours Settings
        </h4>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Quiet hours settings are shared globally. Changes made here will apply
        to both meeting recaps, daily/weekly digests, and reminders.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full">
          <label
            htmlFor="sharedQuietHoursStart"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Start Time
          </label>
          <select
            id="sharedQuietHoursStart"
            name="quietHoursStart"
            value={preferences.quietHoursStart}
            onChange={handleChange}
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">None (Disabled)</option>
            {hoursOptions.map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label
            htmlFor="sharedQuietHoursEnd"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            End Time
          </label>
          <select
            id="sharedQuietHoursEnd"
            name="quietHoursEnd"
            value={preferences.quietHoursEnd}
            onChange={handleChange}
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">None (Disabled)</option>
            {hoursOptions.map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-full">
          <label
            htmlFor="sharedTimezone"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Timezone (Explicit)
          </label>
          <div className="flex gap-2">
            <input
              id="sharedTimezone"
              type="text"
              name="timezone"
              value={preferences.timezone}
              onChange={handleChange}
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. UTC, America/New_York"
            />
            <button
              type="button"
              onClick={() => {
                const tz =
                  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
                handleChange({ target: { name: "timezone", value: tz } });
              }}
              className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 whitespace-nowrap transition-colors"
            >
              Detect Local
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <svg
            className="w-3.5 h-3.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2.918M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Active Timezone:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {preferences.timezone}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{getNextSendPreview()}</span>
        </div>
      </div>
    </div>
  );
};

export default SharedQuietHours;
