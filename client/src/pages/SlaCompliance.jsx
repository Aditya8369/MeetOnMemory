import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import AppContent from "../context/AppContent";
import Navbar from "../components/Navbar";
import {
  getSlaBreaches,
  getSlaComplianceStats,
  acknowledgeBreach,
} from "../services/actionItemSlaApi";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiUser,
  FiActivity,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-toastify";

const SlaCompliance = () => {
  const { getUserData } = useContext(AppContent);
  const user = getUserData();
  const organizationId = user?.currentOrganization?._id;

  const [stats, setStats] = useState(null);
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [statsData, breachesData] = await Promise.all([
        getSlaComplianceStats(organizationId),
        getSlaBreaches(organizationId),
      ]);
      setStats(statsData);
      setBreaches(breachesData);
    } catch {
      toast.error("Failed to load SLA data");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (breachId) => {
    try {
      await acknowledgeBreach(breachId);
      toast.success("Breach acknowledged");
      loadData(); // Reload data
    } catch {
      toast.error("Failed to acknowledge breach");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-500 animate-pulse">
              Loading compliance data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  SLA Compliance Dashboard
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Track and manage Action Item Service Level Agreement (SLA)
                  breaches.
                </p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 mr-4">
                  <FiAlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total Breaches
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats?.totalBreaches || 0}
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 mr-4">
                  <FiActivity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Open Breaches
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats?.openBreaches || 0}
                  </p>
                </div>
              </div>

              {/* Top Breaching Assignees */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-2">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center">
                  <FiUser className="mr-2" /> Top Breaching Assignees
                </p>
                <div className="space-y-3">
                  {stats?.breachesByAssignee?.length > 0 ? (
                    stats.breachesByAssignee.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {item.assignee ? item.assignee.name : "Unassigned"}
                        </span>
                        <span className="text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                          {item.count} breaches
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No breaches found.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Breaches Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Recent SLA Breaches
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Action Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Type & Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Target vs Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {breaches.map((breach) => (
                      <tr
                        key={breach._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[250px]">
                            {breach.actionItem?.text || "Unknown Action Item"}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center">
                            <FiClock className="mr-1" />
                            {formatDistanceToNow(new Date(breach.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                            {breach.breachType} SLA
                          </div>
                          <span
                            className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                            ${
                              breach.priority === "urgent"
                                ? "bg-red-100 text-red-800"
                                : breach.priority === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : breach.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                            }`}
                          >
                            {breach.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-slate-300">
                            {breach.assignee?.name || "Unassigned"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          <div>Target: {breach.targetHours}h</div>
                          <div className="text-red-600 dark:text-red-400 font-medium">
                            Actual: {breach.actualHours}h
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {breach.status === "open" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Acknowledged
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {breach.status === "open" && (
                            <button
                              onClick={() => handleAcknowledge(breach._id)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                            >
                              <FiCheckCircle className="mr-1" /> Acknowledge
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {breaches.length === 0 && (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                        >
                          No SLA breaches found. Great job!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SlaCompliance;
