import React from "react";

/**
 * @desc Displays a stack of avatars for currently active users in the document.
 * Shows a tooltip with the user's name on hover.
 */
const PresenceAvatars = ({ users = [] }) => {
  // Limit display to 5 avatars, show "+X" for the rest
  const maxDisplay = 5;
  const visibleUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  return (
    <div className="flex items-center -space-x-2">
      {visibleUsers.map((user) => (
        <div
          key={user.userId}
          className="relative group"
          title={user.userName || "Anonymous"}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.userName}
              className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
              style={{ borderColor: user.userColor || "#ccc" }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800 shadow-sm"
              style={{ backgroundColor: user.userColor || "#6366f1" }}
            >
              {user.userName?.charAt(0).toUpperCase() || "?"}
            </div>
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {user.userName || "Anonymous"}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      ))}

      {remainingCount > 0 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800 shadow-sm">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default PresenceAvatars;
