import React, { useState } from "react";
import {
  Plus,
  Trash2,
  MessageSquare,
  Search,
  X,
  ChevronDown,
  Edit2,
  Download,
} from "lucide-react";

/**
 * ChatSessionSidebar - Optimized sidebar for AI Assistant workspace
 * Features:
 * - Compact design with 14rem width (reduced from 18rem)
 * - Search functionality for quick session navigation
 * - Collapsible sections for better space utilization
 * - Improved visual hierarchy and spacing
 * - Clean non-nested interactive HTML structure for accessibility (#1229)
 */
const ChatSessionSidebar = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const inTitle = session.title?.toLowerCase().includes(query);
    const inId =
      session.id?.toLowerCase().includes(query) ||
      session._id?.toLowerCase().includes(query);
    const inMessages = session.messages?.some((m) =>
      m.content?.toLowerCase().includes(query),
    );

    return inTitle || inId || inMessages;
  });

  // Group sessions by date for better organization
  const groupSessionsByDate = (sessions) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    sessions.forEach((session) => {
      const sessionDate = new Date(session.updatedAt || session.createdAt);

      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= lastWeek) {
        groups.lastWeek.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  const groupedSessions = groupSessionsByDate(filteredSessions);

  /**
   * Render session item with clean non-nested interactive elements (#1229)
   */
  const SessionItem = ({ session }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(session.title || "");
    const sessionId = session.id || session._id;

    const handleExport = (e) => {
      e.stopPropagation();
      const transcript =
        session.messages
          ?.map(
            (m) =>
              `**${m.role === "user" ? "You" : "Assistant"}**: ${m.content}`,
          )
          .join("\n\n") || "No messages";
      const blob = new Blob([transcript], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${sessionId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const submitRename = () => {
      if (editTitle.trim() && editTitle !== session.title && onRenameSession) {
        onRenameSession(sessionId, editTitle.trim());
      }
      setIsEditing(false);
    };

    return (
      <div
        className={`group relative flex w-full items-center gap-1 rounded-lg pr-1 text-left text-sm transition-all duration-150 ${
          currentSessionId === sessionId
            ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/70"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectSession(sessionId)}
          className="flex flex-1 items-center gap-2 overflow-hidden py-2 pl-2.5 cursor-pointer text-left focus:outline-none"
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") {
                  setEditTitle(session.title || "");
                  setIsEditing(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-500 rounded px-1 py-0.5 text-xs text-gray-900 dark:text-white"
            />
          ) : (
            <span className="flex-1 truncate font-medium">
              {session.title || "Untitled Chat"}
            </span>
          )}
        </button>

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="rounded p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 cursor-pointer"
              aria-label="Rename conversation"
              title="Rename conversation"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 cursor-pointer"
              aria-label="Export conversation"
              title="Export conversation"
            >
              <Download className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    "Are you sure you want to delete this conversation?",
                  )
                ) {
                  onDeleteSession(sessionId);
                }
              }}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 cursor-pointer"
              aria-label="Delete conversation"
              title="Delete conversation"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render session group with collapsible header
   */
  const SessionGroup = ({ title, sessions }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (sessions.length === 0) return null;

    return (
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer"
        >
          <span>{title}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              isExpanded ? "rotate-0" : "-rotate-90"
            }`}
          />
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {sessions.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-56 flex-col border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100/50 dark:border-gray-700 dark:from-gray-800/80 dark:to-gray-900/80">
      {/* Header with search and new chat button */}
      <div className="border-b border-gray-200 bg-white/50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onNewSession}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 cursor-pointer"
            aria-label="Start new chat"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`rounded-lg p-1.5 transition cursor-pointer ${
              showSearch
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
                : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
            aria-label="Search conversations"
            title="Search"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="mt-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 pr-8 text-xs placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sessions list with scrollable area */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
        {filteredSessions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {searchQuery ? "No conversations match" : "No conversations yet"}
            </p>
            {!searchQuery && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Start a new chat to begin
              </p>
            )}
          </div>
        ) : (
          <>
            <SessionGroup title="Today" sessions={groupedSessions.today} />
            <SessionGroup
              title="Yesterday"
              sessions={groupedSessions.yesterday}
            />
            <SessionGroup
              title="Last 7 Days"
              sessions={groupedSessions.lastWeek}
            />
            <SessionGroup title="Older" sessions={groupedSessions.older} />
          </>
        )}
      </div>

      {/* Footer with session count */}
      {sessions.length > 0 && (
        <div className="border-t border-gray-200 bg-white/50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {sessions.length} {sessions.length === 1 ? "chat" : "chats"} total
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatSessionSidebar;
