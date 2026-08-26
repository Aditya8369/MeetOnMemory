import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";

export const useKeywordAlerts = () => {
  const [watchlist, setWatchlist] = useState({
    keywords: [],
    notifyViaEmail: true,
    notifyViaApp: true,
    isActive: true,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get("/alerts/keywords");
      setWatchlist({
        keywords: data.keywords || [],
        notifyViaEmail: data.notifyViaEmail ?? true,
        notifyViaApp: data.notifyViaApp ?? true,
        isActive: data.isActive ?? true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to fetch keyword alerts",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const { data } = await apiClient.get("/alerts/keywords/history");
      if (data?.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch keyword alert history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const updateWatchlist = async (updates) => {
    try {
      setError(null);
      const { data } = await apiClient.put("/alerts/keywords", updates);
      setWatchlist({
        keywords: data.keywords || [],
        notifyViaEmail: data.notifyViaEmail ?? true,
        notifyViaApp: data.notifyViaApp ?? true,
        isActive: data.isActive ?? true,
      });
      return true;
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to update keyword alerts",
      );
      return false;
    }
  };

  const toggleAlerts = async (isActive) => {
    try {
      setError(null);
      const { data } = await apiClient.patch("/alerts/keywords/toggle", {
        isActive,
      });
      setWatchlist((prev) => ({ ...prev, isActive: data.isActive }));
      return true;
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to toggle keyword alerts",
      );
      return false;
    }
  };

  const testSendAlert = async (keyword, channel = "app") => {
    try {
      setError(null);
      const { data } = await apiClient.post("/alerts/keywords/test-send", {
        keyword,
        channel,
      });
      if (data?.entry) {
        setHistory((prev) => [data.entry, ...prev]);
      }
      return { success: true, data };
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to trigger test-send alert";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const clearHistory = async () => {
    try {
      await apiClient.delete("/alerts/keywords/history");
      setHistory([]);
      return true;
    } catch (err) {
      console.error("Failed to clear history:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchWatchlist();
    fetchHistory();
  }, [fetchWatchlist, fetchHistory]);

  return {
    watchlist,
    history,
    loading,
    historyLoading,
    error,
    updateWatchlist,
    toggleAlerts,
    testSendAlert,
    clearHistory,
    refresh: fetchWatchlist,
    refreshHistory: fetchHistory,
  };
};

export default useKeywordAlerts;
