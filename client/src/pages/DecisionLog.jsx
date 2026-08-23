import React, { useState, useEffect } from "react";
import {
  getDecisionLog,
  getDecisionTimeline,
  updateDecisionOutcome,
} from "../services/decisionLogApi";
// Assuming recharts is available for timeline chart, if not this can be adapted
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const OutcomeBadge = ({ outcome }) => {
  const colors = {
    implemented: "bg-green-100 text-green-800",
    reversed: "bg-red-100 text-red-800",
    deferred: "bg-yellow-100 text-yellow-800",
    pending: "bg-gray-100 text-gray-800",
    superseded: "bg-purple-100 text-purple-800",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[outcome] || colors.pending}`}
    >
      {outcome}
    </span>
  );
};

const DecisionLog = () => {
  const [log, setLog] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchLog = async () => {
    try {
      setLoading(true);
      const data = await getDecisionLog({ page, outcome: outcomeFilter });
      setLog(data.entries);
    } catch (error) {
      console.error("Failed to fetch decision log", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const data = await getDecisionTimeline();
      setTimeline(data);
    } catch (error) {
      console.error("Failed to fetch timeline", error);
    }
  };

  useEffect(() => {
    fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, outcomeFilter]);

  useEffect(() => {
    fetchTimeline();
  }, []);

  const handleOutcomeChange = async (id, newOutcome) => {
    try {
      await updateDecisionOutcome(id, { outcome: newOutcome });
      fetchLog();
      fetchTimeline();
    } catch (error) {
      console.error("Failed to update outcome", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Decision Log</h1>
        <select
          className="border rounded p-2"
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
        >
          <option value="">All Outcomes</option>
          <option value="implemented">Implemented</option>
          <option value="reversed">Reversed</option>
          <option value="deferred">Deferred</option>
          <option value="pending">Pending</option>
          <option value="superseded">Superseded</option>
        </select>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white p-4 rounded-lg shadow h-64">
        <h2 className="text-lg font-semibold mb-4">Decision Timeline</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthYear" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="implemented" stackId="a" fill="#10B981" />
            <Bar dataKey="pending" stackId="a" fill="#9CA3AF" />
            <Bar dataKey="deferred" stackId="a" fill="#F59E0B" />
            <Bar dataKey="reversed" stackId="a" fill="#EF4444" />
            <Bar dataKey="superseded" stackId="a" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Decision Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Decision
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Decided By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : log.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-4">
                  No decisions found.
                </td>
              </tr>
            ) : (
              log.map((entry) => (
                <React.Fragment key={entry._id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === entry._id ? null : entry._id)
                    }
                  >
                    <td className="px-6 py-4">
                      {entry.decisionId?.text || "Unknown Decision"}
                    </td>
                    <td className="px-6 py-4">
                      {entry.decidedBy?.name || "Unknown User"}
                    </td>
                    <td className="px-6 py-4">
                      <OutcomeBadge outcome={entry.outcome} />
                    </td>
                    <td className="px-6 py-4">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                  {/* Expanded Detail Panel */}
                  {expandedId === entry._id && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan="4" className="px-6 py-4">
                        <div className="space-y-4">
                          <div>
                            <strong>Impact Assessment: </strong>
                            {entry.impactAssessment || "None provided"}
                          </div>
                          <div>
                            <strong>Linked Action Items: </strong>
                            {entry.linkedActionItems?.length > 0 ? (
                              <ul className="list-disc pl-5 mt-2">
                                {entry.linkedActionItems.map((item) => (
                                  <li key={item._id}>
                                    {item.text} - {item.status}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              "No action items linked."
                            )}
                          </div>
                          <div>
                            <strong>Change Outcome: </strong>
                            <select
                              className="ml-2 border rounded p-1"
                              value={entry.outcome}
                              onChange={(e) =>
                                handleOutcomeChange(entry._id, e.target.value)
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="implemented">Implemented</option>
                              <option value="reversed">Reversed</option>
                              <option value="deferred">Deferred</option>
                              <option value="superseded">Superseded</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionLog;
