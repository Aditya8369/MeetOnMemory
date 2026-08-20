import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

const IssueTrackerConfig = ({ provider, title, description, icon }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configData, setConfigData] = useState({});
  const [tokenInput, setTokenInput] = useState("");
  const [projectInput, setProjectInput] = useState("");

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/api/issue-tracker/${provider}/config`);
      if (res.data?.data) {
        setIsConnected(true);
        setConfigData(res.data.data.config || {});
        setProjectInput(
          res.data.data.config?.projectId ||
            res.data.data.config?.projectKey ||
            res.data.data.config?.teamId ||
            "",
        );
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error(`Error fetching ${provider} config:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error("Please enter a valid access token");
      return;
    }

    try {
      setIsSaving(true);

      const payloadConfig = {};
      if (provider === "jira") payloadConfig.projectKey = projectInput;
      if (provider === "linear") payloadConfig.teamId = projectInput;
      // You could also collect siteUrl for Jira here

      await apiClient.post(`/api/issue-tracker/${provider}/config`, {
        accessToken: tokenInput,
        config: payloadConfig,
      });

      toast.success(`Connected to ${title} successfully`);
      setTokenInput("");
      fetchConfig();
    } catch (error) {
      toast.error(`Failed to connect to ${title}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsSaving(true);
      await apiClient.delete(`/api/issue-tracker/${provider}/disconnect`);
      toast.success(`Disconnected from ${title}`);
      setIsConnected(false);
      setConfigData({});
    } catch (error) {
      toast.error(`Failed to disconnect from ${title}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></div>
        ) : isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Disconnect"
            )}
          </button>
        ) : null}
      </div>

      {!isLoading && !isConnected && (
        <form
          onSubmit={handleConnect}
          className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Personal Access Token
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`Enter your ${title} token`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Default Project / Team Key
            </label>
            <input
              type="text"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`e.g. PROJ or TEAM-ID`}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSaving || !tokenInput}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Connect {title}
          </button>
        </form>
      )}

      {isConnected && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Connected Project / Team
              </span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {configData?.projectKey || configData?.teamId || "Configured"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Two-way sync active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueTrackerConfig;
