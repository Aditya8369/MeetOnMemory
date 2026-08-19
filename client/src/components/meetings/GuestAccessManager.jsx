import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  createGuestToken,
  getMeetingGuestTokens,
  revokeGuestToken,
} from "../../services/guestAccessApi";

const GuestAccessManager = ({ meetingId }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    guestEmail: "",
    permissions: [],
    expiresAt: "",
    maxViews: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  useEffect(() => {
    if (isExpanded) {
      fetchTokens();
    }
  }, [isExpanded, fetchTokens]);

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMeetingGuestTokens(meetingId);
      setTokens(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load guest tokens");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const handlePermissionChange = (perm) => {
    setFormData((prev) => {
      const perms = new Set(prev.permissions);
      if (perms.has(perm)) {
        perms.delete(perm);
      } else {
        perms.add(perm);
      }
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!formData.guestEmail || !formData.expiresAt) {
      toast.error("Email and Expiry Date are required");
      return;
    }

    try {
      setCreating(true);
      const data = await createGuestToken(meetingId, formData);
      toast.success("Guest token created successfully");
      setGeneratedLink(`${window.location.origin}/guest/${data.token}`);
      setFormData({
        guestEmail: "",
        permissions: [],
        expiresAt: "",
        maxViews: 0,
      });
      fetchTokens();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to create guest token",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId) => {
    try {
      await revokeGuestToken(tokenId);
      toast.success("Token revoked");
      fetchTokens();
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke token");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.info("Link copied to clipboard");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2
          className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          Guest Access Manager
        </h2>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateToken}
            className="space-y-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Create New Guest Link
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guest Email
                </label>
                <input
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, guestEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="guest@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Views (0 for unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxViews}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxViews: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {[
                    "view_transcript",
                    "view_summary",
                    "view_action_items",
                    "add_comments",
                  ].map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm)}
                        onChange={() => handlePermissionChange(perm)}
                        className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span>
                        {perm
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm font-medium disabled:opacity-50"
            >
              {creating ? "Generating..." : "Generate Guest Link"}
            </button>
          </form>

          {generatedLink && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
              <span className="text-green-800 dark:text-green-300 font-mono text-sm truncate mr-4">
                {generatedLink}
              </span>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Active & Revoked Tokens
            </h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading tokens...</p>
            ) : tokens.length === 0 ? (
              <p className="text-sm text-gray-500">
                No guest tokens created yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tokens.map((token) => (
                      <tr key={token._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {token.guestEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(token.expiresAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {token.currentViews} / {token.maxViews || "∞"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {token.revoked ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Revoked
                            </span>
                          ) : new Date(token.expiresAt) < new Date() ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!token.revoked &&
                            new Date(token.expiresAt) > new Date() && (
                              <button
                                onClick={() => handleRevoke(token._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Revoke
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestAccessManager;
