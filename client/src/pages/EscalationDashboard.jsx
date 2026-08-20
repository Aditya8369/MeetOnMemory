import React, { useState, useEffect, useContext } from "react";
import AppContent from "../context/AppContent";
import {
  getEscalationDashboardMetrics,
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "../services/escalationApi";
import { toast } from "react-toastify";
import {
  FaChartLine,
  FaCheckCircle,
  FaExclamationCircle,
  FaShieldAlt,
  FaPlus,
  FaTrash,
  FaEdit,
} from "react-line-icons";

const EscalationDashboard = () => {
  const { currentOrganization } = useContext(AppContent);
  const [metrics, setMetrics] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Policy Form State
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    description: "",
    steps: [],
  });
  const [newStep, setNewStep] = useState({
    delayHours: 24,
    actionType: "notify",
    targetRole: "manager",
  });

  useEffect(() => {
    if (currentOrganization?._id) {
      loadData();
    }
  }, [currentOrganization, loadData]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, policyData] = await Promise.all([
        getEscalationDashboardMetrics(currentOrganization._id),
        getPolicies(currentOrganization._id),
      ]);
      setMetrics(dashData);
      setPolicies(policyData);
    } catch {
      toast.error("Failed to load escalation data");
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  const handleAddStep = () => {
    setNewPolicy({ ...newPolicy, steps: [...newPolicy.steps, newStep] });
    setNewStep({ delayHours: 24, actionType: "notify", targetRole: "manager" });
  };

  const handleRemoveStep = (index) => {
    const updatedSteps = newPolicy.steps.filter((_, i) => i !== index);
    setNewPolicy({ ...newPolicy, steps: updatedSteps });
  };

  const handleSavePolicy = async () => {
    if (!newPolicy.name) {
      toast.error("Policy name is required");
      return;
    }

    try {
      await createPolicy({
        ...newPolicy,
        organization: currentOrganization._id,
      });
      toast.success("Policy created successfully");
      setShowPolicyForm(false);
      setNewPolicy({ name: "", description: "", steps: [] });
      loadData();
    } catch {
      toast.error("Failed to create policy");
    }
  };

  const handleDeletePolicy = async (id) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      try {
        await deletePolicy(id);
        toast.success("Policy deleted");
        loadData();
      } catch {
        toast.error("Failed to delete policy");
      }
    }
  };

  const handleTogglePolicy = async (policy) => {
    try {
      await updatePolicy(policy._id, { isActive: !policy.isActive });
      toast.success(`Policy ${!policy.isActive ? "activated" : "deactivated"}`);
      loadData();
    } catch {
      toast.error("Failed to update policy status");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            Escalation Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and track automated action item escalations.
          </p>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Escalated"
          value={metrics?.metrics?.totalEscalated || 0}
          icon="FaExclamationCircle"
          color="from-red-400 to-red-600"
        />
        <MetricCard
          title="Active Escalated"
          value={metrics?.metrics?.activeEscalated || 0}
          icon="FaExclamationCircle"
          color="from-orange-400 to-orange-600"
        />
        <MetricCard
          title="Resolved After Esc."
          value={metrics?.metrics?.resolvedEscalated || 0}
          icon="FaCheckCircle"
          color="from-green-400 to-green-600"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${metrics?.metrics?.resolutionRate || 0}%`}
          icon="FaChartLine"
          color="from-blue-400 to-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Escalated Items */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Active Escalated Items</h2>
          {metrics?.activeEscalatedItems?.length === 0 ? (
            <p className="text-gray-500 italic py-4 text-center">
              No active escalated items currently.
            </p>
          ) : (
            <div className="space-y-4">
              {metrics?.activeEscalatedItems?.map((item) => (
                <div
                  key={item._id}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-200">
                      {item.text}
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      Due: {new Date(item.dueDate).toLocaleDateString()} •
                      Assignee: {item.assignee?.name || "Unassigned"}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full text-xs font-bold uppercase tracking-wide">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-xl font-semibold mt-10 mb-4">
            Recent Escalation Events
          </h2>
          {metrics?.recentEvents?.length === 0 ? (
            <p className="text-gray-500 italic py-4 text-center">
              No recent events.
            </p>
          ) : (
            <div className="space-y-4">
              {metrics?.recentEvents?.slice(0, 5).map((event) => (
                <div
                  key={event._id}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                >
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-2">
                    <span>{new Date(event.triggeredAt).toLocaleString()}</span>
                    <span>Policy: {event.policy?.name}</span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">
                    {event.actionTaken}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Policies */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Active Policies</h2>
            <button
              onClick={() => setShowPolicyForm(!showPolicyForm)}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md text-sm font-medium transition-colors"
            >
              + New Policy
            </button>
          </div>

          {showPolicyForm && (
            <div className="mb-8 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg space-y-4">
              <input
                type="text"
                placeholder="Policy Name"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newPolicy.name}
                onChange={(e) =>
                  setNewPolicy({ ...newPolicy, name: e.target.value })
                }
              />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Escalation Steps
                </h4>
                {newPolicy.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 p-2 rounded shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 rounded">
                      {step.delayHours}h
                    </span>
                    <span>→ {step.actionType}</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {step.targetRole}
                    </span>
                    <button
                      onClick={() => handleRemoveStep(idx)}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      x
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 items-center pt-2">
                  <input
                    type="number"
                    className="w-16 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    value={newStep.delayHours}
                    onChange={(e) =>
                      setNewStep({
                        ...newStep,
                        delayHours: Number(e.target.value),
                      })
                    }
                    placeholder="Hrs"
                  />
                  <select
                    className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    value={newStep.actionType}
                    onChange={(e) =>
                      setNewStep({ ...newStep, actionType: e.target.value })
                    }
                  >
                    <option value="notify">Notify</option>
                    <option value="reassign">Reassign</option>
                  </select>
                  <select
                    className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    value={newStep.targetRole}
                    onChange={(e) =>
                      setNewStep({ ...newStep, targetRole: e.target.value })
                    }
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                  <button
                    onClick={handleAddStep}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded text-sm font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSavePolicy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm font-medium transition-colors"
                >
                  Save Policy
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {policies.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">
                No escalation policies configured.
              </p>
            ) : (
              policies.map((policy) => (
                <div
                  key={policy._id}
                  className={`p-4 border rounded-xl transition-all ${policy.isActive ? "border-indigo-200 bg-white shadow-sm dark:border-indigo-800 dark:bg-gray-800" : "border-gray-200 bg-gray-50 opacity-75 dark:border-gray-700 dark:bg-gray-900"}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{policy.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTogglePolicy(policy)}
                        className={`text-xs px-2 py-1 rounded font-medium ${policy.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}
                      >
                        {policy.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {policy.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        After {step.delayHours}h:{" "}
                        <span className="font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {step.actionType}
                        </span>{" "}
                        {step.targetRole}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-shadow">
    <div
      className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 ease-in-out`}
    ></div>
    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide uppercase">
      {title}
    </h3>
    <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
      {value}
    </p>
  </div>
);

export default EscalationDashboard;
