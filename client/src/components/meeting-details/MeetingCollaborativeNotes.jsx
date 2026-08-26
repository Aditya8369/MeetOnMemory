import React, { useState, useContext } from "react";
import { FileText, ChevronDown, ChevronUp, Users } from "lucide-react";
import AppContent from "../../context/AppContent";
import { hasPermission } from "../../utils/rbacPermissions";
import CollaborativeEditor from "../meetings/CollaborativeEditor";

const MeetingCollaborativeNotes = ({ meeting }) => {
  const [expanded, setExpanded] = useState(true);
  const { userData } = useContext(AppContent);
  const userRole = userData?.role || "member";
  const canEdit = hasPermission(userRole, "meetings", "edit");
  const isReadOnly = !canEdit;

  const meetingId = meeting?._id || meeting?.id;

  if (!meetingId) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors rounded-t-lg"
        data-testid="toggle-collab-notes-btn"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Collaborative Notes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isReadOnly
                ? "Live collaborative meeting notes (Read-Only)"
                : "Real-time collaborative notes editor with presence & version history"}
            </p>
          </div>
          {/* Badge */}
          <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
            <Users size={11} />
            {isReadOnly ? "Read-Only" : "Collaborative"}
          </span>
        </div>
        <div className="text-gray-400 dark:text-gray-500 shrink-0 ml-4">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="px-6 pb-6">
          <CollaborativeEditor meetingId={meetingId} isReadOnly={isReadOnly} />
        </div>
      )}
    </div>
  );
};

export default MeetingCollaborativeNotes;
