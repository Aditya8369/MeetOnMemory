// client/src/hooks/useGitHubIntegration.js
import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/**
 * Custom React hook for managing GitHub Integration.
 * Provides status fetching, OAuth initiation, repo listing, and disconnect actions.
 * All API routes use `/api/github/...` and reference environment-configured backend URLs.
 */
export const useGitHubIntegration = (organizationId = "") => {
  const [isConnected, setIsConnected] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch current GitHub integration status.
   */
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/github/status", {
        params: organizationId ? { organizationId } : {},
      });

      if (response.data?.success) {
        setIsConnected(Boolean(response.data.isConnected));
        setGithubUser(response.data.githubUser || null);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error("Error checking GitHub status:", err);
      setError(err.response?.data?.message || "Failed to check GitHub status.");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  /**
   * Initiate GitHub OAuth connection.
   */
  const connectGitHub = useCallback(() => {
    const params = new URLSearchParams();
    if (organizationId) {
      params.append("organizationId", organizationId);
    }
    const connectUrl = `${BACKEND_URL}/api/github/connect${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    window.location.href = connectUrl;
  }, [organizationId]);

  /**
   * Disconnect GitHub integration.
   */
  const disconnectGitHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/api/github/disconnect", {
        organizationId,
      });
      if (response.data?.success) {
        setIsConnected(false);
        setGithubUser(null);
        setRepositories([]);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error disconnecting GitHub:", err);
      setError(err.response?.data?.message || "Failed to disconnect GitHub.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  /**
   * Fetch connected repositories.
   */
  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/github/repos", {
        params: organizationId ? { organizationId } : {},
      });
      if (response.data?.success) {
        setRepositories(response.data.repositories || []);
        return response.data.repositories || [];
      }
      return [];
    } catch (err) {
      console.error("Error fetching GitHub repos:", err);
      setError(err.response?.data?.message || "Failed to fetch repositories.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    isConnected,
    githubUser,
    repositories,
    loading,
    error,
    fetchStatus,
    connectGitHub,
    disconnectGitHub,
    fetchRepos,
  };
};

export default useGitHubIntegration;
