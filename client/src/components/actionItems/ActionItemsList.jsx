import React, { useEffect, useState } from "react";
import { useActionItems } from "../../hooks/useActionItems";
import ActionItemCard from "./ActionItemCard";

/**
 * @desc Kanban-style board displaying action items grouped by status.
 * Supports drag-and-drop (simplified here with buttons for status changes).
 */
const ActionItemsList = ({ meetingId }) => {
  const { items, isLoading, fetchItems, fetchMeetingItems, updateItem } =
    useActionItems();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (meetingId) {
      fetchMeetingItems(meetingId);
    } else {
      fetchItems({ status: filter !== "all" ? filter : undefined });
    }
  }, [meetingId, filter, fetchItems, fetchMeetingItems]);

  const columns = [
    { id: "pending", title: "To Do", color: "bg-gray-500" },
    { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
    { id: "completed", title: "Done", color: "bg-green-500" },
    { id: "overdue", title: "Overdue", color: "bg-red-500" },
  ];

  const handleStatusChange = async (itemId, newStatus) => {
    await updateItem(itemId, { status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!meetingId && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
          >
            All Tasks
          </button>
          {columns.map((col) => (
            <button
              key={col.id}
              onClick={() => setFilter(col.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === col.id ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
            >
              {col.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnItems = items.filter((item) => item.status === column.id);

          return (
            <div
              key={column.id}
              className="flex flex-col bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 min-h-[400px]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
                    {column.title}
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                  {columnItems.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                {columnItems.length === 0 ? (
                  <div className="h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
                    No tasks
                  </div>
                ) : (
                  columnItems.map((item) => (
                    <ActionItemCard
                      key={item._id}
                      item={item}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionItemsList;
