import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import AppContent from "../context/AppContent.js";
import apiClient from "../services/apiClient.js";
import Navbar from "../components/Navbar.jsx";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
];

const TopicExplorer = () => {
  const { userData } = useContext(AppContent);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  const orgId = userData?.organization?._id || userData?.organization;

  const fetchClusters = useCallback(async () => {
    try {
      if (!orgId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const res = await apiClient.get(`/api/topics/clusters/org/${orgId}`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setClusters(res.data.data);
      } else if (Array.isArray(res.data?.data)) {
        setClusters(res.data.data);
      } else {
        setClusters([]);
      }
    } catch (err) {
      console.error("Error fetching clusters", err);
      setError("Failed to load topic clusters. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  const renameCluster = async (clusterId, newLabel) => {
    try {
      await apiClient.put(`/api/topics/clusters/${clusterId}`, {
        label: newLabel,
      });
      fetchClusters(); // Refresh
    } catch (err) {
      console.error("Error renaming cluster", err);
    }
  };

  // Prepare deterministic coordinates for bubble chart
  const chartData = useMemo(() => {
    return clusters.map((c, index) => {
      // Deterministic layout angle & radius to keep clusters stable
      const angle = (index * 137.5 * Math.PI) / 180;
      const radius = 20 + ((index * 15) % 30);
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);

      return {
        name: c.label,
        count: c.meetingCount,
        x: Math.max(10, Math.min(90, x)),
        y: Math.max(10, Math.min(90, y)),
        fill: COLORS[index % COLORS.length],
        ...c,
      };
    });
  }, [clusters]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-6">Topic Explorer</h1>

        {loading && (
          <div className="p-8 text-center text-gray-500">
            Loading Topic Clusters...
          </div>
        )}

        {error && !loading && (
          <div
            data-testid="topic-error-state"
            className="p-8 max-w-md mx-auto text-center bg-white dark:bg-gray-800 rounded-xl shadow border border-red-200 dark:border-red-800"
          >
            <h2 className="text-xl font-bold mb-2">Failed to Load Topics</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              data-testid="retry-button"
              onClick={fetchClusters}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div
                role="region"
                aria-label="Topic Clusters Overview Chart"
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-96"
              >
                <h2 className="text-xl font-semibold mb-4">
                  Topic Clusters Overview
                </h2>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="x"
                      domain={[0, 100]}
                      hide
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="y"
                      domain={[0, 100]}
                      hide
                    />
                    <ZAxis
                      type="number"
                      dataKey="count"
                      range={[100, 1000]}
                      name="Meetings"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ payload }) => {
                        if (payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border shadow rounded text-sm text-gray-800">
                              <p className="font-bold">{data.name}</p>
                              <p>Meetings: {data.count}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      name="Topics"
                      data={chartData}
                      onClick={(e) => setSelectedCluster(e.payload)}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div
                role="region"
                aria-label="Topic Clusters Grid"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {clusters.map((cluster) => (
                  <div
                    key={cluster._id}
                    className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow cursor-pointer transition ${selectedCluster?._id === cluster._id ? "ring-2 ring-blue-500" : "hover:shadow-md"}`}
                    onClick={() => setSelectedCluster(cluster)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{cluster.label}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {cluster.meetingCount} meetings
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {cluster.canonicalTopicNames?.slice(0, 3).join(", ")}
                    </div>
                  </div>
                ))}
                {clusters.length === 0 && (
                  <p className="text-sm text-gray-500 col-span-2 text-center py-6">
                    No topic clusters found.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              {selectedCluster ? (
                <div
                  role="region"
                  aria-label="Selected Cluster Details"
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow sticky top-28"
                >
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedCluster.label}
                  </h2>
                  <button
                    className="text-sm text-blue-500 hover:underline mb-4"
                    onClick={() => {
                      const newLabel = window.prompt(
                        "Enter new label:",
                        selectedCluster.label,
                      );
                      if (newLabel && newLabel !== selectedCluster.label) {
                        renameCluster(selectedCluster._id, newLabel);
                      }
                    }}
                  >
                    Rename Cluster
                  </button>
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                      Meetings
                    </h4>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedCluster.meetingCount}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Canonical Names
                    </h4>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {selectedCluster.canonicalTopicNames?.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 h-full flex items-center justify-center text-gray-500 text-center">
                  Select a cluster to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicExplorer;
