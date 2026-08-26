import React, { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Save } from "lucide-react";
import apiClient from "../services/apiClient";

const DEFAULTS = {
  dormantAfterDays: 30,
  archivedAfterDays: 90,
  expiredAfterDays: 365,
  minImportanceScoreToProtect: 70,
  hardDeleteExpired: false,
};

const MemoryRetentionPolicyPanel = () => {
  const [policy, setPolicy] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPolicy = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get(
        "/api/knowledge/lifecycle/retention-policy",
      );
      setPolicy({ ...DEFAULTS, ...(response.data?.policy || {}) });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load retention policy.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, []);

  const savePolicy = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiClient.patch(
        "/api/knowledge/lifecycle/retention-policy",
        {
          dormantAfterDays: Number(policy.dormantAfterDays),
          archivedAfterDays: Number(policy.archivedAfterDays),
          expiredAfterDays: Number(policy.expiredAfterDays),
          minImportanceScoreToProtect: Number(
            policy.minImportanceScoreToProtect,
          ),
          hardDeleteExpired: Boolean(policy.hardDeleteExpired),
        },
      );

      setPolicy({ ...DEFAULTS, ...(response.data?.policy || {}) });
      setMessage("Retention policy saved.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save retention policy.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading retention policy...
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Organization retention policy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Admin-configured thresholds used by lifecycle sweeps. Expiry
            deletion stays disabled unless explicitly enabled.
          </p>
        </div>
        <AlertCircle className="w-4 h-4 text-amber-500" />
      </div>

      <form onSubmit={savePolicy} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ["dormantAfterDays", "Dormant after (days)"],
            ["archivedAfterDays", "Archive after (days)"],
            ["expiredAfterDays", "Expire after (days)"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {label}
              <input
                type="number"
                min="1"
                max="3650"
                value={policy[key]}
                onChange={(event) =>
                  setPolicy((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Importance protection score
            <input
              type="number"
              min="1"
              max="100"
              value={policy.minImportanceScoreToProtect}
              onChange={(event) =>
                setPolicy((previous) => ({
                  ...previous,
                  minImportanceScoreToProtect: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 pt-6">
            <input
              type="checkbox"
              checked={policy.hardDeleteExpired}
              onChange={(event) =>
                setPolicy((previous) => ({
                  ...previous,
                  hardDeleteExpired: event.target.checked,
                }))
              }
            />
            Allow sweeps to permanently delete already-expired memories
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save retention policy
          </button>
          {message && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <Check className="w-3.5 h-3.5" />
              {message}
            </span>
          )}
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
      </form>
    </section>
  );
};

export default MemoryRetentionPolicyPanel;
