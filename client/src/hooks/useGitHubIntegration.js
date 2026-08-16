import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";

const useGitHubIntegration = (organizationId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [repositoryFullName, setRepositoryFullName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/github/status/${organizationId}`);
      setIsConnected(res.data.isConnected);
      if (res.data.isConnected) {
        setRepositoryFullName(res.data.repositoryFullName);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch GitHub connection status");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connect = () => {
    // Redirects to backend auth which redirects to GitHub
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    window.location.href = `${apiUrl}/api/github/auth?organizationId=${organizationId}`;
  };

  const disconnect = async () => {
    try {
      setIsLoading(true);
      await apiClient.delete(`/github/disconnect/${organizationId}`);
      setIsConnected(false);
      setRepositoryFullName("");
    } catch (err) {
      console.error(err);
      setError("Failed to disconnect GitHub");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    repositoryFullName,
    isLoading,
    error,
    connect,
    disconnect,
    refetch: fetchStatus,
  };
};

export default useGitHubIntegration;
