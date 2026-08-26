import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Loader2, Save, Play, Clock, AlertTriangle, Info } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { organizationApi } from "../services/organizationApi.js";
import * as dataRetentionApi from "../services/dataRetentionApi.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const DataRetentionSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [organizationId, setOrganizationId] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [policy, setPolicy] = useState({
    enabled: false,
    retentionPeriodDays: 365,
    gracePeriodDays: 30,
    scope: ["meetings", "transcripts", "summaries"],
    exemptTags: [],
    runHistory: [],
    lastRunAt: null,
  });

  const [preview, setPreview] = useState({ archivedCount: 0, deletedCount: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: orgData } = await organizationApi.getOrganizationSettings();

      if (orgData.success && orgData.organization) {
        const orgId = orgData.organization._id;
        setOrganizationId(orgId);

        const policyData = await dataRetentionApi.getPolicy(orgId);
        if (policyData) {
          setPolicy(policyData);
        }

        if (policyData.enabled) {
          const previewData = await dataRetentionApi.getSweepPreview(orgId);
          setPreview(previewData);
        }
      }
    } catch (error) {
      console.error("Error fetching data retention settings:", error);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!organizationId) return;

    try {
      setSaving(true);
      const updatedPolicy = await dataRetentionApi.updatePolicy(
        organizationId,
        {
          enabled: policy.enabled,
          retentionPeriodDays: policy.retentionPeriodDays,
          gracePeriodDays: policy.gracePeriodDays,
          scope: policy.scope,
          exemptTags: policy.exemptTags,
        },
      );

      setPolicy(updatedPolicy);
      toast.success("Data retention policy updated.");

      if (updatedPolicy.enabled) {
        const previewData =
          await dataRetentionApi.getSweepPreview(organizationId);
        setPreview(previewData);
      }
    } catch (error) {
      console.error("Error saving policy:", error);
      toast.error("Failed to save policy.");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSweep = async () => {
    if (!organizationId) return;
    try {
      setSweeping(true);
      const result = await dataRetentionApi.triggerSweep(organizationId);
      toast.success(
        `Sweep complete. Archived: ${result.result.archivedCount}, Deleted: ${result.result.deletedCount}`,
      );
      await fetchData(); // Reload everything to get updated history
    } catch (error) {
      console.error("Error triggering sweep:", error);
      toast.error("Failed to run data retention sweep.");
    } finally {
      setSweeping(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPolicy((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTagsChange = (e) => {
    const val = e.target.value;
    setPolicy((prev) => ({
      ...prev,
      exemptTags: val
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Data Retention Policy
            </h1>
            <p className="text-slate-500 mt-1">
              Configure automatic archival and deletion of old meetings to
              ensure compliance.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Settings Form */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Policy Configuration</h2>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="enabled"
                      className="sr-only"
                      checked={policy.enabled}
                      onChange={handleChange}
                    />
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors ${policy.enabled ? "bg-blue-500" : "bg-slate-300"}`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${policy.enabled ? "transform translate-x-4" : ""}`}
                    ></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-slate-700">
                    {policy.enabled ? "Enabled" : "Disabled"}
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Retention Period (Days)
                  </label>
                  <input
                    type="number"
                    name="retentionPeriodDays"
                    value={policy.retentionPeriodDays}
                    onChange={handleChange}
                    disabled={!policy.enabled}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    min="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Meetings older than this will enter the grace period.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    name="gracePeriodDays"
                    value={policy.gracePeriodDays}
                    onChange={handleChange}
                    disabled={!policy.enabled}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Meetings are soft-deleted during the grace period and
                    permanently deleted afterward.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Exempt Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={policy.exemptTags.join(", ")}
                    onChange={handleTagsChange}
                    disabled={!policy.enabled}
                    placeholder="e.g. legal, do-not-delete"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Meetings with these tags will never be archived or deleted.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Run History</h2>
              {policy.runHistory.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No sweeps have run yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Archived</th>
                        <th className="px-4 py-2">Deleted</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policy.runHistory
                        .slice()
                        .reverse()
                        .map((run, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="px-4 py-2">
                              {new Date(run.runAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">{run.archivedCount}</td>
                            <td className="px-4 py-2">{run.deletedCount}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${run.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {run.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Preview Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-500" />
                Live Preview
              </h2>
              {policy.enabled ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800 text-sm font-medium">
                        To be Archived:
                      </span>
                      <span className="text-lg font-bold text-yellow-900">
                        {preview.archivedCount}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <span className="text-red-800 text-sm font-medium">
                        To be Deleted:
                      </span>
                      <span className="text-lg font-bold text-red-900">
                        {preview.deletedCount}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="w-full mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Run Sweep Now
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Enable the policy to see a preview of items to be archived or
                  deleted.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Execute Manual Sweep?"
        message="This will immediately soft-delete meetings entering the grace period and permanently delete expired meetings. This action cannot be fully undone."
        confirmText="Run Sweep"
        confirmStyle="danger"
        onConfirm={handleTriggerSweep}
        onCancel={() => setIsConfirmModalOpen(false)}
        loading={sweeping}
      />
    </div>
  );
};

export default DataRetentionSettings;
