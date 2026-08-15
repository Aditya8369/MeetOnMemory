import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";

export const useKeywordAlerts = () => {
  const [watchlist, setWatchlist] = useState({
    keywords: [],
    notifyViaEmail: true,
    notifyViaApp: true,
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return {
    watchlist,
    loading,
    error,
    updateWatchlist,
    toggleAlerts,
    refresh: fetchWatchlist,
  };
};

export default useKeywordAlerts;
