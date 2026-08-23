import React from "react";
import Navbar from "../components/Navbar.jsx";
import ActionItemsList from "../components/actionItems/ActionItemsList";

/**
 * @desc Main dashboard page showing all action items assigned to or created by the current user.
 * Provides filtering and a global view across all meetings.
 */
const ActionItemsDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Navbar />
      <div className="pt-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
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
    </div>
  );
};

export default ActionItemsDashboard;
