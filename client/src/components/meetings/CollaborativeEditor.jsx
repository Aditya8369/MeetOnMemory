import React, { useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import { useCollaborativeNote } from "../../hooks/useCollaborativeNote";
import PresenceAvatars from "./PresenceAvatars";
import VersionHistory from "./VersionHistory";

/**
 * @desc Main collaborative editor component integrating Tiptap with Yjs.
 * Handles real-time sync, cursor presence, and read-only modes.
 */
const CollaborativeEditor = ({ meetingId, isReadOnly = false }) => {
  const {
    ydoc,
    isConnected,
    isLoading,
    activeUsers,
    userColor,
    broadcastCursor,
    saveSnapshot,
  } = useCollaborativeNote(meetingId, isReadOnly);

  const extensions = useMemo(() => {
    const baseExtensions = [
      StarterKit.configure({
        // Disable history because Yjs handles undo/redo via CRDT
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
        field: "collaborative-note",
      }),
      Placeholder.configure({
        placeholder: isReadOnly
          ? ""
          : "Start typing your meeting notes here...",
      }),
    ];

    // Only enable cursor tracking if user can edit
    if (!isReadOnly) {
      baseExtensions.push(
        CollaborationCursor.configure({
          user: {
            name: "You", // Will be overridden by provider if needed
            color: userColor,
          },
          render: (user) => {
            const cursor = document.createElement("span");
            cursor.classList.add("collaboration-cursor__caret");
            cursor.setAttribute("style", `border-color: ${user.color}`);

            const label = document.createElement("div");
            label.classList.add("collaboration-cursor__label");
            label.setAttribute("style", `background-color: ${user.color}`);
            label.insertBefore(document.createTextNode(user.name), null);
            cursor.insertBefore(label, null);

            return cursor;
          },
        }),
      );
    }

    return baseExtensions;
  }, [ydoc, isReadOnly, userColor]);

  const editor = useEditor({
    extensions,
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none dark:prose-invert min-h-[400px] px-8 py-4",
      },
    },
    onUpdate: ({ editor }) => {
      // Broadcast cursor position on every update (typing)
      const { from, to } = editor.state.selection;
      broadcastCursor(from, to);
    },
    onSelectionUpdate: ({ editor }) => {
      // Broadcast cursor position on selection change (clicking/arrow keys)
      const { from, to } = editor.state.selection;
      broadcastCursor(from, to);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Left Sidebar: Version History */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 hidden md:block">
        <VersionHistory meetingId={meetingId} onSaveSnapshot={saveSnapshot} />
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar: Connection Status & Active Users */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
            ></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isConnected
                ? isReadOnly
                  ? "Viewing Live"
                  : "Connected & Syncing"
                : "Disconnected"}
            </span>
          </div>

          <PresenceAvatars users={activeUsers} />
        </div>

        {/* Tiptap Editor Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* CSS for Collaboration Cursors */}
      <style jsx global>{`
        .collaboration-cursor__caret {
          border-left: 1px solid #0d0d0d;
          border-right: 1px solid #0d0d0d;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }
        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #0d0d0d;
          font-size: 12px;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 0.1rem 0.3rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default CollaborativeEditor;
