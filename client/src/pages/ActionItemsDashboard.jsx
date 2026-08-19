import React from "react";
import ActionItemsList from "../components/actionItems/ActionItemsList";

/**
 * @desc Main dashboard page showing all action items assigned to or created by the current user.
 * Provides filtering and a global view across all meetings.
 */
const ActionItemsDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          My Action Items
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track all your tasks and commitments across all meetings.
        </p>
      </div>

      <ActionItemsList />
    </div>
  );
};

export default ActionItemsDashboard;
