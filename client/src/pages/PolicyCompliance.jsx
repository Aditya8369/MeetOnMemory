import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { policyComplianceApi } from "../services";
import { toast } from "react-toastify";
import {
  ShieldAlert,
  ShieldCheck,
  Link2,
  ShieldQuestion,
  Shield,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  ExternalLink,
  FileText,
  Filter,
  Eye,
  Layers,
  X,
  ArrowRight,
} from "lucide-react";

/**
 * PolicyCompliance.jsx
 * Dashboard of meeting decisions evaluated against organizational policies.
 * Supports filtering by status, compliance classifications, decision compliance details,
 * policy reverse-lookups, and navigation to the main Policies page.
 */

const CLASSIFICATION_STYLES = {
  potential_conflict: {
    label: "Potential Conflict",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-900/60",
    icon: ShieldAlert,
  },
  aligned: {
    label: "Aligned",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-900/60",
    icon: ShieldCheck,
  },
  references: {
    label: "References",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-900/60",
    icon: Link2,
  },
  unrelated: {
    label: "Unrelated",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    textColor: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-200 dark:border-slate-700",
    icon: ShieldQuestion,
  },
  unclassified: {
    label: "Needs Retry",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-900/60",
    icon: ShieldQuestion,
  },
};

const CLASSIFICATION_TABS = [
  { value: "all", label: "All Classifications", icon: Shield },
  {
    value: "potential_conflict",
    label: "Potential Conflicts",
    icon: ShieldAlert,
  },
  { value: "aligned", label: "Aligned", icon: ShieldCheck },
  { value: "references", label: "References", icon: Link2 },
  { value: "unrelated", label: "Unrelated", icon: ShieldQuestion },
  { value: "unclassified", label: "Needs Retry", icon: ShieldQuestion },
];

const STATUS_TABS = [
  { value: "unresolved", label: "Unresolved" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const PolicyCompliance = () => {
  const navigate = useNavigate();

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusTab, setStatusTab] = useState("unresolved");
  const [classificationTab, setClassificationTab] = useState("all");
  const [actioningId, setActioningId] = useState(null);

  // Detail Modal States for getDecisionCompliance & getPolicyRelatedDecisions (Issue #1891)
  const [selectedDecisionId, setSelectedDecisionId] = useState(null);
  const [decisionDetails, setDecisionDetails] = useState(null);
  const [loadingDecisionDetails, setLoadingDecisionDetails] = useState(false);

  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [policyDetails, setPolicyDetails] = useState(null);
  const [loadingPolicyDetails, setLoadingPolicyDetails] = useState(false);

  const fetchFlags = useCallback(async (status, classification) => {
    try {
      setLoading(true);
      setError(null);
      const res = await policyComplianceApi.getFlags(status, classification);
      if (res.data?.success) {
        setFlags(res.data.flags || []);
      } else {
        setError(res.data?.message || "Failed to load compliance flags");
      }
    } catch (err) {
      console.error("Error fetching compliance flags:", err);
      setError("Unable to fetch compliance flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags(statusTab, classificationTab);
  }, [statusTab, classificationTab, fetchFlags]);

  // Fetch Decision Compliance Details (Issue #1891)
  const handleOpenDecisionDetails = async (decisionId) => {
    if (!decisionId) return;
    try {
      setSelectedDecisionId(decisionId);
      setLoadingDecisionDetails(true);
      setDecisionDetails(null);
      const res = await policyComplianceApi.getDecisionCompliance(decisionId);
      if (res.data?.success) {
        setDecisionDetails(res.data.data);
      } else {
        toast.error(
          res.data?.message || "Failed to load decision compliance details",
        );
      }
    } catch (err) {
      console.error("Error fetching decision compliance:", err);
      toast.error("Failed to load decision details");
    } finally {
      setLoadingDecisionDetails(false);
    }
  };

  // Fetch Policy Related Decisions / Reverse Lookup (Issue #1891)
  const handleOpenPolicyDetails = async (policyId) => {
    if (!policyId) return;
    try {
      setSelectedPolicyId(policyId);
      setLoadingPolicyDetails(true);
      setPolicyDetails(null);
      const res = await policyComplianceApi.getPolicyRelatedDecisions(policyId);
      if (res.data?.success) {
        setPolicyDetails(res.data.data);
      } else {
        toast.error(
          res.data?.message || "Failed to load policy related decisions",
        );
      }
    } catch (err) {
      console.error("Error fetching policy related decisions:", err);
      toast.error("Failed to load policy details");
    } finally {
      setLoadingPolicyDetails(false);
    }
  };

  // Compute counts per classification for summary cards
  const countsByClassification = useMemo(() => {
    const counts = {
      all: flags.length,
      potential_conflict: 0,
      aligned: 0,
      references: 0,
      unrelated: 0,
      unclassified: 0,
    };
    flags.forEach((flag) => {
      if (counts[flag.classification] !== undefined) {
        counts[flag.classification]++;
      }
    });
    return counts;
  }, [flags]);

  const handleReview = async (flagId, status) => {
    try {
      setActioningId(flagId);
      const res = await policyComplianceApi.updateFlagStatus(flagId, status);
      if (res.data?.success) {
        toast.success(
          status === "acknowledged"
            ? "Flag acknowledged."
            : status === "dismissed"
              ? "Flag dismissed."
              : "Flag reopened.",
        );
        setFlags((prev) =>
          statusTab === "all"
            ? prev.map((f) => (f._id === flagId ? { ...f, status } : f))
            : prev.filter((f) => f._id !== flagId),
        );
      } else {
        toast.error(res.data?.message || "Failed to update flag");
      }
    } catch (err) {
      console.error("Error updating flag:", err);
      toast.error("Failed to update flag");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Policy Compliance
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Meeting decisions evaluated against organizational policies. Drill
              down into decision compliance, reverse policy lookups, and policy
              breakdowns.
            </p>
          </div>
          <button
            onClick={() => navigate("/policies")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Manage Policies
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-800">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                statusTab === tab.value
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Classification Filter Chips / Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 items-center bg-slate-100/70 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 ml-1 mr-2">
            <Filter className="w-3.5 h-3.5" />
            Classification:
          </span>
          {CLASSIFICATION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = classificationTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setClassificationTab(tab.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : ""}`}
                />
                {tab.label}
                {classificationTab === "all" &&
                  countsByClassification[tab.value] !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                      {countsByClassification[tab.value]}
                    </span>
                  )}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading compliance flags...
          </div>
        )}

        {!loading && error && (
          <p className="text-red-500 text-sm py-8 text-center">{error}</p>
        )}

        {!loading && !error && flags.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            No{" "}
            {classificationTab !== "all"
              ? classificationTab.replace("_", " ")
              : ""}{" "}
            {statusTab === "all" ? "" : statusTab} compliance records found.
          </div>
        )}

        <div className="space-y-4">
          {flags.map((flag) => {
            const style =
              CLASSIFICATION_STYLES[flag.classification] ||
              CLASSIFICATION_STYLES.unrelated;
            const Icon = style.icon;
            const decisionObj = flag.decisionId;
            const policyObj = flag.policyId;

            return (
              <div
                key={flag._id}
                className={`rounded-xl border p-4 bg-white dark:bg-slate-900/50 ${style.borderColor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bgColor} ${style.textColor}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {style.label}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {Math.round((flag.similarityScore || 0) * 100)}% match
                      </span>
                    </div>

                    {/* Decision detail trigger */}
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {decisionObj?.text || "Decision unavailable"}
                      </p>
                      {decisionObj?._id && (
                        <button
                          onClick={() =>
                            handleOpenDecisionDetails(decisionObj._id)
                          }
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          title="View all compliance policies linked to this decision"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                      )}
                    </div>

                    {/* Policy detail / reverse-lookup trigger */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                        {policyObj?.name || "Policy unavailable"}
                        {flag.policyVersion && ` · v${flag.policyVersion}`}
                      </div>
                      {policyObj?._id && (
                        <button
                          onClick={() => handleOpenPolicyDetails(policyObj._id)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          title="View all decisions associated with this policy"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Related Decisions
                        </button>
                      )}
                    </div>

                    {flag.reasoning && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-700 pl-2">
                        {flag.reasoning}
                      </p>
                    )}

                    {flag.sourceMeetingId && (
                      <button
                        onClick={() =>
                          navigate(`/meeting/${flag.sourceMeetingId._id}`)
                        }
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {flag.sourceMeetingId.title}
                      </button>
                    )}
                  </div>

                  {/* Review actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {flag.status !== "acknowledged" && (
                      <button
                        disabled={actioningId === flag._id}
                        onClick={() => handleReview(flag._id, "acknowledged")}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60 disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                    )}
                    {flag.status !== "dismissed" && (
                      <button
                        disabled={actioningId === flag._id}
                        onClick={() => handleReview(flag._id, "dismissed")}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    )}
                    {flag.status !== "unresolved" && (
                      <button
                        disabled={actioningId === flag._id}
                        onClick={() => handleReview(flag._id, "unresolved")}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Compliance Detail Modal (getDecisionCompliance) */}
      {selectedDecisionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => {
                setSelectedDecisionId(null);
                setDecisionDetails(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Decision Compliance Breakdown
            </h2>

            {loadingDecisionDetails && (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading decision compliance...
              </div>
            )}

            {!loadingDecisionDetails && decisionDetails && (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-1">
                    Evaluated Decision
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {decisionDetails.decision?.text}
                  </p>
                </div>

                <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  Linked Policies ({decisionDetails.compliance?.length || 0})
                </h3>

                <div className="space-y-3">
                  {(decisionDetails.compliance || []).map((rec) => {
                    const style =
                      CLASSIFICATION_STYLES[rec.classification] ||
                      CLASSIFICATION_STYLES.unrelated;
                    const Icon = style.icon;

                    return (
                      <div
                        key={rec._id}
                        className={`p-3 rounded-lg border bg-white dark:bg-slate-900 ${style.borderColor}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${style.bgColor} ${style.textColor}`}
                          >
                            <Icon className="w-3 h-3" />
                            {style.label}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {Math.round((rec.similarityScore || 0) * 100)}%
                            match
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {rec.policyId?.name} (v
                          {rec.policyId?.version || "1.0"})
                        </p>
                        {rec.reasoning && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                            {rec.reasoning}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Policy Reverse-Lookup Modal (getPolicyRelatedDecisions) */}
      {selectedPolicyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => {
                setSelectedPolicyId(null);
                setPolicyDetails(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Policy Reverse-Lookup
              </h2>
              <button
                onClick={() => navigate("/policies")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Go to Policies <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {loadingPolicyDetails && (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading policy related decisions...
              </div>
            )}

            {!loadingPolicyDetails && policyDetails && (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-1">
                    Policy
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {policyDetails.policy?.name} (v
                    {policyDetails.policy?.version || "1.0"})
                  </p>
                </div>

                <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  Related Meeting Decisions (
                  {policyDetails.relatedDecisions?.length || 0})
                </h3>

                <div className="space-y-3">
                  {(policyDetails.relatedDecisions || []).map((rec) => {
                    const style =
                      CLASSIFICATION_STYLES[rec.classification] ||
                      CLASSIFICATION_STYLES.unrelated;
                    const Icon = style.icon;

                    return (
                      <div
                        key={rec._id}
                        className={`p-3 rounded-lg border bg-white dark:bg-slate-900 ${style.borderColor}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${style.bgColor} ${style.textColor}`}
                          >
                            <Icon className="w-3 h-3" />
                            {style.label}
                          </span>
                          {rec.sourceMeetingId && (
                            <button
                              onClick={() =>
                                navigate(`/meeting/${rec.sourceMeetingId._id}`)
                              }
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {rec.sourceMeetingId.title}
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {rec.decisionId?.text || "Decision text unavailable"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyCompliance;
