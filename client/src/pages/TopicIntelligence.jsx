import React, { useState, useCallback, useMemo } from "react";
import {
  useTopicDashboard,
  useOrphanedTopics,
  useCoOccurrenceGraph,
  useGenerateBriefing,
} from "../hooks/useTopicIntelligence";
import ForceGraph2D from "react-force-graph-2d";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Loader2,
} from "lucide-react";

const TrendIcon = ({ trend }) => {
  if (trend === "rising")
    return <TrendingUp className="text-green-500 w-5 h-5" />;
  if (trend === "declining")
    return <TrendingDown className="text-red-500 w-5 h-5" />;
  return <Minus className="text-gray-400 w-5 h-5" />;
};

export default function TopicIntelligence() {
  const { data: dashboardData, isLoading: dashboardLoading } =
    useTopicDashboard();
  const { data: orphanedData, isLoading: orphanedLoading } =
    useOrphanedTopics();
  const { data: graphData, isLoading: graphLoading } = useCoOccurrenceGraph();
  const { mutate: generateBriefing, isPending: briefingLoading } =
    useGenerateBriefing();

  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [briefing, setBriefing] = useState("");

  const handleNodeClick = useCallback((node) => {
    setSelectedTopicId(node.id);
    setBriefing(""); // Reset briefing
  }, []);

  const handleGenerateBriefing = (clusterId) => {
    generateBriefing(clusterId, {
      onSuccess: (data) => {
        setBriefing(data.briefing);
      },
    });
  };

  const formattedHeatmapData = useMemo(() => {
    if (!dashboardData?.trends) return [];

    // We want weeks as X-axis and topics as Y-axis, or vice versa.
    // For simplicity, let's create a list of weeks, and each week has counts per topic.
    const weeksSet = new Set();
    dashboardData.trends.forEach((t) => {
      t.history.forEach((h) => weeksSet.add(h.weekStarting));
    });

    const weeks = Array.from(weeksSet).sort();

    return weeks.map((week) => {
      const weekObj = {
        name: new Date(week).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      };
      dashboardData.trends.forEach((t) => {
        const hist = t.history.find((h) => h.weekStarting === week);
        weekObj[t.label] = hist ? hist.occurrences : 0;
      });
      return weekObj;
    });
  }, [dashboardData]);

  if (dashboardLoading || orphanedLoading || graphLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Topic Intelligence</h1>
        <p className="text-gray-500 mt-2">
          Analyze macro trends, co-occurrences, and knowledge gaps across all
          meetings.
        </p>
      </header>

      {orphanedData?.orphanedTopics?.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle
                className="h-5 w-5 text-yellow-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Orphaned Topics Detected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  These topics were discussed over 30 days ago but have no
                  associated Action Items or Decisions:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {orphanedData.orphanedTopics.map((t) => (
                    <li key={t.clusterId}>
                      <strong>{t.label}</strong> (Last seen:{" "}
                      {new Date(t.weekStarting).toLocaleDateString()})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Heatmap / Trends Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Topic Volume Over Time
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedHeatmapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                {dashboardData?.trends?.map((trend, i) => (
                  <Line
                    key={trend.clusterId}
                    type="monotone"
                    dataKey={trend.label}
                    stroke={`hsl(${(i * 137.5) % 360}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Trends Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Current Trends
          </h2>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {dashboardData?.trends?.map((trend) => (
              <div
                key={trend.clusterId}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <TrendIcon trend={trend.currentTrend} />
                  <span className="font-medium text-gray-700">
                    {trend.label}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {trend.isOrphaned && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full mr-2">
                      Orphaned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Network Graph */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Co-Occurrence Network
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Topics connected by lines appear together in the same meetings.
          Thicker lines indicate stronger relationships. Click a node to
          analyze.
        </p>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-[500px]">
            {graphData && (
              <ForceGraph2D
                graphData={graphData}
                nodeLabel="label"
                nodeColor={() => "#3b82f6"}
                nodeRelSize={6}
                linkColor={() => "#cbd5e1"}
                linkWidth={(link) => Math.sqrt(link.weight || 1)}
                onNodeClick={handleNodeClick}
                width={800}
                height={500}
                backgroundColor="#f8fafc"
              />
            )}
          </div>

          {/* Briefing Panel */}
          <div className="w-full lg:w-1/3 bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col h-[500px]">
            {selectedTopicId ? (
              <>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-primary" />
                  Topic Briefing
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  {
                    graphData?.nodes?.find((n) => n.id === selectedTopicId)
                      ?.label
                  }
                </p>

                <div className="flex-1 overflow-y-auto bg-white p-4 rounded-md border border-gray-100 shadow-inner mb-4">
                  {briefingLoading ? (
                    <div className="flex justify-center items-center h-full text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Generating briefing...
                    </div>
                  ) : briefing ? (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {briefing}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <p className="text-center">
                        Click 'Generate' to create an AI summary of all
                        discussions related to this topic.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleGenerateBriefing(selectedTopicId)}
                  disabled={briefingLoading}
                  className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium shadow-sm"
                >
                  Generate AI Briefing
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-center p-4">
                Click a node in the graph to view its briefing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
