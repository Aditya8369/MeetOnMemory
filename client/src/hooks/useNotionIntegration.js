import { useState, useEffect, useCallback } from "react";
import { notionIntegrationApi } from "../services/notionIntegrationApi.js";
import { toast } from "react-toastify";

export const useNotionIntegration = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [targetDatabaseId, setTargetDatabaseId] = useState("");
  const [databases, setDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notionIntegrationApi.getStatus();
      if (data.success && data.connected) {
        setConnected(true);
        setWorkspaceName(data.workspaceName);
        setTargetDatabaseId(data.targetDatabaseId || "");
        fetchDatabases();
      } else {
        setConnected(false);
      }
    } catch (err) {
      console.error("Failed to fetch Notion integration status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDatabases = async () => {
    try {
      setLoadingDatabases(true);
      const { data } = await notionIntegrationApi.getDatabases();
      if (data.success) {
        setDatabases(data.databases);
      }
    } catch (err) {
      console.error("Failed to fetch databases:", err);
      toast.error("Failed to fetch Notion databases.");
    } finally {
      setLoadingDatabases(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { data } = await notionIntegrationApi.getAuthUrl();
      if (data.success && data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to get Notion Auth URL:", err);
      toast.error("Failed to connect to Notion.");
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      const { data } = await notionIntegrationApi.disconnect();
      if (data.success) {
        setConnected(false);
        setWorkspaceName("");
        setTargetDatabaseId("");
        setDatabases([]);
        toast.success("Disconnected from Notion successfully.");
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("Failed to disconnect from Notion.");
    } finally {
      setSaving(false);
    }
  };

  const saveDatabaseMapping = async (dbId) => {
    try {
      setSaving(true);
      const { data } = await notionIntegrationApi.saveMapping(dbId);
      if (data.success) {
        setTargetDatabaseId(dbId);
        toast.success("Notion database mapping saved!");
      }
    } catch (err) {
      console.error("Failed to save mapping:", err);
      toast.error("Failed to save database mapping.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    loading,
    connected,
    workspaceName,
    targetDatabaseId,
    databases,
    loadingDatabases,
    saving,
    handleConnect,
    handleDisconnect,
    saveDatabaseMapping,
  };
};
