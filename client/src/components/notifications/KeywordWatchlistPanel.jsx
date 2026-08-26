import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  Mail,
  Loader2,
  Save,
  Send,
  History,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { useKeywordAlerts } from "../../hooks/useKeywordAlerts";

const KeywordWatchlistPanel = () => {
  const {
    watchlist,
    history,
    loading,
    historyLoading,
    error,
    updateWatchlist,
    toggleAlerts,
    testSendAlert,
    clearHistory,
    refreshHistory,
  } = useKeywordAlerts();

  const [keywords, setKeywords] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [notifyViaEmail, setNotifyViaEmail] = useState(true);
  const [notifyViaApp, setNotifyViaApp] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Test-Send Simulator state
  const [testKeyword, setTestKeyword] = useState("");
  const [testChannel, setTestChannel] = useState("app");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (watchlist && !loading) {
      setKeywords(watchlist.keywords || []);
      setNotifyViaEmail(watchlist.notifyViaEmail);
      setNotifyViaApp(watchlist.notifyViaApp);
      setIsActive(watchlist.isActive);
      if (watchlist.keywords?.length > 0 && !testKeyword) {
        setTestKeyword(watchlist.keywords[0]);
      }
    }
  }, [watchlist, loading, testKeyword]);

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
        if (!testKeyword) setTestKeyword(newKeyword);
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

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testKeyword.trim()) return;

    setIsTesting(true);
    setTestResult(null);
    const res = await testSendAlert(testKeyword, testChannel);
    setIsTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: res.data?.message || "Simulation dispatched!",
      });
      setTimeout(() => setTestResult(null), 4000);
    } else {
      setTestResult({
        success: false,
        message: res.error || "Failed to trigger test send",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Main Watchlist Configuration Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Keyword Watchlist
              <span className="text-xs px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
                Live Scanner
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get notified in real-time when critical projects, clients, or
              blockers are detected in transcripts.
            </p>
          </div>
          <button
            onClick={() => toggleAlerts(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3.5 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/40">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div
          className={`space-y-6 ${
            !isActive ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* Keywords Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
              Monitored Keywords & Phrases (Press Enter to add)
            </label>
            <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg text-xs font-semibold shadow-2xs"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none ml-1 cursor-pointer"
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
                placeholder="e.g. Q3 Roadmap, Budget, Alpha"
                className="flex-1 bg-transparent min-w-[140px] outline-hidden text-xs p-1 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
              Keywords must be at least 3 characters long. Up to 50 keywords.
            </p>
          </div>

          {/* Notification Channels */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">
              Delivery Channels
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyViaApp}
                  onChange={(e) => setNotifyViaApp(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                  <Bell className="w-4 h-4 text-blue-500" />
                  In-App Notification
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyViaEmail}
                  onChange={(e) => setNotifyViaEmail(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                  <Mail className="w-4 h-4 text-purple-500" />
                  Email Digest Alert
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {saveMessage}
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-xs disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Test-Send Simulator */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/40 rounded-xl text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Keyword Alert Test-Send Simulator
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Test and preview notification routing before live meetings
                occur.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleTestSend} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={testKeyword}
                onChange={(e) => setTestKeyword(e.target.value)}
                placeholder="Keyword to simulate (e.g. Budget)"
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={testChannel}
                onChange={(e) => setTestChannel(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-hidden"
              >
                <option value="app">In-App Simulator</option>
                <option value="email">Email Channel</option>
              </select>

              <button
                type="submit"
                disabled={isTesting || !testKeyword.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Test Send</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>
      </div>

      {/* 3. Delivery History Audit Log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Delivery History Log
            </h4>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshHistory}
              disabled={historyLoading}
              title="Refresh History"
              className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCw
                className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`}
              />
            </button>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
            <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              No alert delivery events recorded yet.
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Alerts triggered during transcript processing or via Test Send
              will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      item.channel === "email"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        : item.channel === "app"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    }`}
                  >
                    {item.channel}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {item.summary ||
                        `Triggered for keywords: ${item.matchedKeywords?.join(", ")}`}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {item.meetingTitle && `Meeting: ${item.meetingTitle} • `}
                      {item.sentAt
                        ? new Date(item.sentAt).toLocaleString()
                        : "Just now"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      item.status === "delivered"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : item.status === "simulated"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    {item.status || "delivered"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeywordWatchlistPanel;
