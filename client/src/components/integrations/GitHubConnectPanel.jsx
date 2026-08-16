import React, { useEffect } from "react";
import useGitHubIntegration from "../../hooks/useGitHubIntegration";
import { useLocation, useNavigate } from "react-router-dom";

const GitHubConnectPanel = ({ organizationId }) => {
  const {
    isConnected,
    repositoryFullName,
    isLoading,
    error,
    connect,
    disconnect,
  } = useGitHubIntegration(organizationId);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("github_success") === "true") {
      // Clear query params
      params.delete("github_success");
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#24292e] text-white rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              GitHub Issues Integration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically sync Action Items to your GitHub repository.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
        ) : isConnected ? (
          <button
            onClick={disconnect}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors"
          >
            Connect GitHub
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {isConnected && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                Connected Repository
              </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {repositoryFullName}
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

export default GitHubConnectPanel;
