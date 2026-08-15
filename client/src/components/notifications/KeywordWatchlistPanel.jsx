import React, { useState, useEffect } from "react";
import { X, Bell, Mail, Power, Loader2, Save } from "lucide-react";
import { useKeywordAlerts } from "../../hooks/useKeywordAlerts";

const KeywordWatchlistPanel = () => {
  const { watchlist, loading, error, updateWatchlist, toggleAlerts } =
    useKeywordAlerts();

  const [keywords, setKeywords] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [notifyViaEmail, setNotifyViaEmail] = useState(true);
  const [notifyViaApp, setNotifyViaApp] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (watchlist && !loading) {
      setKeywords(watchlist.keywords || []);
      setNotifyViaEmail(watchlist.notifyViaEmail);
      setNotifyViaApp(watchlist.notifyViaApp);
      setIsActive(watchlist.isActive);
    }
  }, [watchlist, loading]);

  const handleAddKeyword = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newKeyword = inputValue.trim();
      if (
        newKeyword &&
        !keywords.includes(newKeyword) &&
        newKeyword.length >= 3
      ) {
        setKeywords([...keywords, newKeyword]);
        setInputValue("");
      }
    }
  };

  const removeKeyword = (kwToRemove) => {
    setKeywords(keywords.filter((kw) => kw !== kwToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    const success = await updateWatchlist({
      keywords,
      notifyViaEmail,
      notifyViaApp,
      isActive,
    });

    if (success) {
      setSaveMessage("Settings saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Keyword Watchlist
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              New
            </span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Get notified when specific projects, clients, or topics are
            mentioned in meetings.
          </p>
        </div>
        <button
          onClick={() => toggleAlerts(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div
        className={`space-y-6 ${!isActive ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* Keywords Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keywords or Phrases (Press Enter to add)
          </label>
          <div className="p-2 border border-gray-300 rounded-md bg-gray-50 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
            {keywords.map((kw, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 bg-white border border-gray-200 text-gray-800 px-2.5 py-1 rounded-md text-sm shadow-sm"
              >
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  className="text-gray-400 hover:text-red-500 focus:outline-none ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleAddKeyword}
              placeholder="e.g. Project Titan"
              className="flex-1 bg-transparent min-w-[120px] outline-none text-sm p-1"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Keywords must be at least 3 characters long.
          </p>
        </div>

        {/* Notification Channels */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Notification Channels
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyViaApp}
                onChange={(e) => setNotifyViaApp(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <Bell className="w-4 h-4 text-gray-500" />
                In-app Notifications
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyViaEmail}
                onChange={(e) => setNotifyViaEmail(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <Mail className="w-4 h-4 text-gray-500" />
                Email Alerts
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-green-600 font-medium">
            {saveMessage}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-medium transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeywordWatchlistPanel;
