import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  Plus,
  Pin,
  X,
  Sparkles,
  Bot,
  User,
  Loader2,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import useAssistant from "../context/useAssistant.js";
import ChatSessionSidebar from "../components/ChatSessionSidebar.jsx";
import SourceCitation from "../components/SourceCitation.jsx";
import { consumePendingAssistantPin } from "../utils/askAssistant.js";

/**
 * AiAssistant Workspace Page (#2011)
 * Full-page AI Assistant workspace with conversation history sidebar, message stream,
 * pinned meeting context, and deep-link query support.
 */
const AiAssistant = () => {
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  const {
    sessions,
    currentSessionId,
    messages,
    inputValue,
    setInputValue,
    isStreaming,
    error,
    isSocketConnected,
    isRateLimited,
    pinnedContext,
    handleSelectSession,
    handleNewSession,
    handleDeleteSession,
    handleRenameSession,
    handleSendMessage,
    ensureSessionAndPin,
    handleUnpinContext,
  } = useAssistant();

  const [showSidebar, setShowSidebar] = useState(true);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Consume deep-link query params or pending sessionStorage pin (#2011)
  useEffect(() => {
    const meetingId =
      searchParams.get("meetingId") || searchParams.get("refId");
    const meetingTitle = searchParams.get("title") || "Pinned Meeting Context";
    const prompt = searchParams.get("prompt");

    const pendingPin = consumePendingAssistantPin();
    const pinToApply =
      pendingPin ||
      (meetingId
        ? { type: "meeting", refId: String(meetingId), title: meetingTitle }
        : null);

    if (pinToApply) {
      ensureSessionAndPin(pinToApply).catch((err) =>
        console.error("Error pinning context:", err),
      );
    } else if (!currentSessionId && sessions.length === 0) {
      handleNewSession();
    }

    if (prompt) {
      setInputValue(prompt);
    }
  }, [
    searchParams,
    ensureSessionAndPin,
    currentSessionId,
    sessions.length,
    handleNewSession,
    setInputValue,
  ]);

  const currentSession = sessions.find(
    (s) => (s.id || s._id) === currentSessionId,
  );

  const samplePrompts = [
    "Summarize key decisions from recent meetings",
    "What action items are assigned to me?",
    "Generate a meeting agenda for tomorrow's sprint review",
    "Find discussions related to product roadmap",
  ];

  const handleSamplePromptClick = (promptText) => {
    setInputValue(promptText);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />

      <div className="pt-16 flex-1 flex overflow-hidden max-h-[calc(100vh)]">
        {/* Conversation History Sidebar */}
        <div
          className={`${
            showSidebar ? "w-64 border-r" : "w-0 overflow-hidden"
          } transition-all duration-200 ease-in-out bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col shrink-0 z-10`}
        >
          <ChatSessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />
        </div>

        {/* Main Assistant Workspace */}
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 overflow-hidden relative">
          {/* Workspace Header Bar */}
          <div className="h-14 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSidebar((prev) => !prev)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
              >
                {showSidebar ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h1 className="font-bold text-gray-900 dark:text-gray-100 text-sm md:text-base truncate">
                  {currentSession?.title || "AI Assistant Workspace"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Socket Connection Status */}
              <div
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                title={
                  isSocketConnected
                    ? "Real-time streaming connected"
                    : "Connecting..."
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSocketConnected
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span className="hidden sm:inline">
                  {isSocketConnected ? "Connected" : "Reconnecting"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNewSession}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>
          </div>

          {/* Pinned Context Banner */}
          {pinnedContext && (
            <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Pin className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold">Pinned Context:</span>
                <span className="truncate">
                  {pinnedContext.title || pinnedContext.refId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleUnpinContext}
                className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded text-indigo-500 hover:text-indigo-700 cursor-pointer"
                title="Remove pinned context"
                aria-label="Remove pinned context"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                  <Bot className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                  Ask me anything about your meetings, action items, transcript
                  highlights, or organizational knowledge base.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  {samplePrompts.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSamplePromptClick(promptText)}
                      className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-xl text-xs text-gray-700 dark:text-gray-300 transition text-left cursor-pointer"
                    >
                      💡 {promptText}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 max-w-3xl ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div
                    className={`flex flex-col space-y-2 max-w-[85%] rounded-2xl p-4 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none shadow-sm"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitation sources={msg.sources} />
                    )}
                  </div>
                </div>
              ))
            )}

            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI Assistant is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error & Rate Limit Alerts */}
          {error && (
            <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRateLimited && (
            <div className="mx-4 mb-2 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Rate limit reached. Please wait a moment before sending another
                message.
              </span>
            </div>
          )}

          {/* Input Composer Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 max-w-4xl mx-auto"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask assistant about meetings, notes, or action items..."
                disabled={isStreaming}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isStreaming}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
