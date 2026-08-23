import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { meetingHealthApi } from "../../services/meetingHealthApi";
import RBACContext from "../../context/RBACContext.jsx";

const CARD_CLASS =
  "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

const HealthScoreCard = ({ meetingId, organizationId }) => {
  const rbac = useContext(RBACContext);
  const canCalculate = rbac?.hasPermission("meetings", "view") ?? false;
  const canViewOrgHealth = rbac?.hasPermission("reports", "view") ?? false;

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(Boolean(meetingId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const inFlightRef = useRef(false);

  const fetchHealth = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (!meetingId || inFlightRef.current) return;

      inFlightRef.current = true;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await meetingHealthApi.getMeetingHealth(meetingId);
        if (res.success && res.data) {
          setHealthData(res.data);
          setError(null);
          setForbidden(false);
        } else {
          setHealthData(null);
          setForbidden(false);
          setError("Meeting health has not been calculated yet.");
        }
      } catch (err) {
        console.error("Failed to fetch meeting health", err);
        const status = err.response?.status;
        const message =
          err.response?.data?.message || "Failed to fetch meeting health";

        if (status === 401 || status === 403) {
          setForbidden(true);
          setHealthData(null);
          setError(
            message ||
              "You are not authorized to view this meeting's health score.",
          );
        } else {
          setForbidden(false);
          setHealthData(null);
          setError(message);
          toast.error(message);
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [meetingId],
  );

  useEffect(() => {
    inFlightRef.current = false;
    setHealthData(null);
    setError(null);
    setForbidden(false);

    if (!meetingId) {
      setLoading(false);
      return;
    }

    fetchHealth();
  }, [meetingId, fetchHealth]);

  const handleCalculateOrRefresh = () => {
    if (!canCalculate || forbidden || inFlightRef.current) return;
    fetchHealth({ isRefresh: true });
  };

  const orgLink = canViewOrgHealth ? (
    <Link
      to="/meeting-health"
      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
    >
      View organization health
    </Link>
  ) : null;

  if (loading) {
    return (
      <div
        data-testid="meeting-health-score-card"
        data-meeting-id={meetingId}
        data-organization-id={organizationId || ""}
        aria-busy="true"
        className={`${CARD_CLASS} animate-pulse`}
      >
        <div
          role="status"
          aria-label="Loading meeting health score"
          className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"
        />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div
        data-testid="meeting-health-score-forbidden"
        data-meeting-id={meetingId}
        data-organization-id={organizationId || ""}
        className={CARD_CLASS}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Meeting Health Score
        </h3>
        <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
          {error ||
            "You are not authorized to view this meeting's health score."}
        </p>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div
        data-testid="meeting-health-score-empty"
        data-meeting-id={meetingId}
        data-organization-id={organizationId || ""}
        className={CARD_CLASS}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Meeting Health Score
          </h3>
          {orgLink}
        </div>
        <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
          {error || "Meeting health has not been calculated yet."}
        </p>
        {canCalculate ? (
          <button
            type="button"
            disabled={refreshing}
            onClick={handleCalculateOrRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {refreshing ? "Calculating..." : "Calculate score"}
          </button>
        ) : null}
      </div>
    );
  }

  const { compositeScore, factors = {}, recommendations } = healthData;

  return (
    <div
      data-testid="meeting-health-score-card"
      data-meeting-id={meetingId}
      data-organization-id={organizationId || ""}
      className={CARD_CLASS}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Meeting Health Score
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {orgLink}
          {canCalculate ? (
            <button
              type="button"
              disabled={refreshing}
              onClick={handleCalculateOrRefresh}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh score"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-750 rounded-full w-32 h-32 border-4 border-gray-100 dark:border-gray-700">
          <span
            className={`text-3xl font-bold ${getScoreColor(compositeScore)}`}
          >
            {compositeScore}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            out of 100
          </span>
        </div>

        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {Object.entries(factors).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span
                  className={`text-sm font-semibold ${getScoreColor(value)}`}
                >
                  {value}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`${getScoreBg(value)} h-2 rounded-full`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Recommendations
          </h4>
          <ul className="list-disc pl-5 space-y-1">
            {recommendations.map((rec, index) => (
              <li
                key={index}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HealthScoreCard;
