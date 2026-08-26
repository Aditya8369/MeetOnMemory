import React, { useEffect, useState } from "react";
import { meetingApi } from "../../services";
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

const CARD_CLASS =
  "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6";

const hasPacingHistory = (reportData = [], agendaProgress) => {
  if (!reportData.length) return false;
  if (agendaProgress === "in_progress" || agendaProgress === "completed") {
    return true;
  }
  return reportData.some((item) => {
    const used =
      (item.actualDurationMs || 0) > 0 || (item.actualDuration || 0) > 0;
    return (
      used ||
      item.status === "completed" ||
      item.status === "skipped" ||
      item.status === "active"
    );
  });
};

const AgendaPacingReport = ({ meetingId }) => {
  const [reportData, setReportData] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [agendaProgress, setAgendaProgress] = useState(null);
  const [loading, setLoading] = useState(Boolean(meetingId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await meetingApi.getAgendaPacingReport(meetingId);
        if (cancelled) return;
        if (res.data.success) {
          setReportData(res.data.reportData || []);
          setSummaryStats(res.data.summaryStats || null);
          setAgendaProgress(res.data.agendaProgress || null);
        } else {
          setError("Failed to load pacing report.");
        }
      } catch (err) {
        console.error("Error fetching pacing report:", err);
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Error loading pacing report.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  if (loading) {
    return (
      <div
        data-testid="agenda-pacing-report"
        data-meeting-id={meetingId}
        aria-busy="true"
        className={`${CARD_CLASS} animate-pulse`}
      >
        <div
          role="status"
          aria-label="Loading agenda pacing report"
          className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"
        />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="agenda-pacing-report-error"
        data-meeting-id={meetingId}
        className={CARD_CLASS}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Agenda Pacing Report
        </h3>
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  if (!hasPacingHistory(reportData, agendaProgress)) {
    return (
      <div
        data-testid="agenda-pacing-report-empty"
        data-meeting-id={meetingId}
        className={CARD_CLASS}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Agenda Pacing Report
        </h3>
        <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
          No agenda timer data was recorded for this meeting. Start, stop, or
          skip agenda items during the live meeting to see planned-vs-actual
          pacing here.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="agenda-pacing-report"
      data-meeting-id={meetingId}
      className={CARD_CLASS}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Agenda Pacing Report
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Planned Time
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {summaryStats?.totalPlanned || 0} min
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Actual Time
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {summaryStats?.totalActual || 0} min
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Items Over Time
          </p>
          <p className="text-xl font-semibold text-amber-600">
            {summaryStats?.itemsOverTime || 0}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Items Skipped
          </p>
          <p className="text-xl font-semibold text-gray-600 dark:text-gray-300">
            {summaryStats?.itemsSkipped || 0}
          </p>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={reportData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="text" tick={{ fill: "#6B7280" }} />
            <YAxis
              label={{
                value: "Minutes",
                angle: -90,
                position: "insideLeft",
                fill: "#6B7280",
              }}
              tick={{ fill: "#6B7280" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                borderColor: "#374151",
                color: "#F9FAFB",
              }}
              itemStyle={{ color: "#F9FAFB" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar
              dataKey="plannedDuration"
              name="Planned (min)"
              fill="#93C5FD"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actualDuration"
              name="Actual (min)"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AgendaPacingReport;
