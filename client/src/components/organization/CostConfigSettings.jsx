import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Users,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getCostConfig,
  updateCostConfig,
} from "../../services/meetingCostApi.js";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const CostConfigSettings = ({ canEdit = false }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [currency, setCurrency] = useState("USD");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(50);
  const [memberOverrides, setMemberOverrides] = useState([]);

  // New override input row state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRate, setNewMemberRate] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCostConfig();
      if (data?.success && data?.config) {
        setCurrency(data.config.currency || "USD");
        setDefaultHourlyRate(data.config.defaultHourlyRate ?? 50);
        setMemberOverrides(data.config.memberRateOverrides || []);
      }
    } catch (err) {
      console.error("Failed to load meeting cost config:", err);
      setError("Failed to load meeting cost configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleAddOverride = () => {
    if (!newMemberEmail.trim()) {
      toast.warning("Please enter a valid member email or user identifier.");
      return;
    }
    const rateNum = parseFloat(newMemberRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.warning("Please enter a valid positive hourly rate.");
      return;
    }

    setMemberOverrides([
      ...memberOverrides,
      {
        user: newMemberEmail.trim(),
        email: newMemberEmail.trim(),
        hourlyRate: rateNum,
      },
    ]);
    setNewMemberEmail("");
    setNewMemberRate("");
    toast.info("Member override added to draft.");
  };

  const handleRemoveOverride = (index) => {
    const updated = memberOverrides.filter((_, i) => i !== index);
    setMemberOverrides(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error("You do not have permission to update cost settings.");
      return;
    }

    const defaultRateNum = parseFloat(defaultHourlyRate);
    if (isNaN(defaultRateNum) || defaultRateNum < 0) {
      toast.error("Default hourly rate must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        currency,
        defaultHourlyRate: defaultRateNum,
        memberRateOverrides: memberOverrides.map((o) => ({
          user: o.user || o.email,
          email: o.email || o.user,
          hourlyRate: Number(o.hourlyRate),
        })),
      };

      const res = await updateCostConfig(payload);
      if (res?.success) {
        toast.success("Meeting cost configuration updated successfully!");
      } else {
        toast.error(res?.message || "Failed to update cost settings.");
      }
    } catch (err) {
      console.error("Error saving cost config:", err);
      toast.error(
        err.response?.data?.message || "Failed to save cost settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        Loading cost configuration...
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Meeting Cost Configuration Panel"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Meeting Cost Calibration & Overrides
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure default hourly rates and per-member compensation
              overrides for financial analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl">
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Feeds Meeting Cost Analytics</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Currency
            </label>
            <select
              aria-label="Cost Currency"
              value={currency}
              disabled={!canEdit || saving}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-60"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Default Hourly Rate ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="1"
              aria-label="Default Hourly Rate"
              value={defaultHourlyRate}
              disabled={!canEdit || saving}
              onChange={(e) => setDefaultHourlyRate(e.target.value)}
              placeholder="50"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Member Overrides Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Member Rate Overrides ({memberOverrides.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Overrides default hourly rate for specific team members
            </span>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                data-testid="override-member-email-input"
                placeholder="Member email or user ID"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <input
                type="number"
                min="1"
                data-testid="override-member-rate-input"
                placeholder={`Rate (${currency})`}
                value={newMemberRate}
                onChange={(e) => setNewMemberRate(e.target.value)}
                className="w-28 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <button
                type="button"
                data-testid="add-override-button"
                onClick={handleAddOverride}
                className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Override
              </button>
            </div>
          )}

          {memberOverrides.length > 0 ? (
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Member Identifier / Email</th>
                    <th className="p-3">Hourly Rate</th>
                    {canEdit && <th className="p-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {memberOverrides.map((override, index) => (
                    <tr key={index} data-testid="override-row">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {override.email || override.user}
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {currency} {override.hourlyRate}/hr
                      </td>
                      {canEdit && (
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            aria-label={`Remove override for ${override.email || override.user}`}
                            onClick={() => handleRemoveOverride(index)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">
              No member overrides configured. All members use the default rate
              of {currency} {defaultHourlyRate}/hr.
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              data-testid="save-cost-config-button"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Cost Settings
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default CostConfigSettings;
