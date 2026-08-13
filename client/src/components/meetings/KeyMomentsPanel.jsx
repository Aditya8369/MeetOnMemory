import React, { useState } from "react";
import { useKeyMoments } from "../../hooks/useKeyMoments";
import { formatTime } from "../../utils/timeUtils"; // assuming a standard time formatter
import { useUser } from "@clerk/clerk-react";

const CATEGORIES = [
  "decision",
  "action_item",
  "insight",
  "question",
  "disagreement",
];
const CATEGORY_COLORS = {
  decision: "bg-blue-100 text-blue-800",
  action_item: "bg-green-100 text-green-800",
  insight: "bg-purple-100 text-purple-800",
  question: "bg-yellow-100 text-yellow-800",
  disagreement: "bg-red-100 text-red-800",
};

export default function KeyMomentsPanel({ meetingId, onJumpToTime }) {
  const { user } = useUser();
  const { moments, isLoading, error, addMoment, removeMoment } =
    useKeyMoments(meetingId);

  const [filterCategory, setFilterCategory] = useState("all");
  const [newMoment, setNewMoment] = useState({
    snippet: "",
    category: "insight",
    startTime: 0,
    endTime: 0,
    note: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const filteredMoments =
    filterCategory === "all"
      ? moments
      : moments.filter((m) => m.category === filterCategory);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await addMoment(newMoment);
      setIsAdding(false);
      setNewMoment({
        snippet: "",
        category: "insight",
        startTime: 0,
        endTime: 0,
        note: "",
      });
    } catch (err) {
      console.error("Failed to add moment:", err);
      alert(err.message || "Failed to add moment");
    }
  };

  if (isLoading)
    return <div className="p-4 text-gray-500">Loading moments...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Key Moments</h2>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMoments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No key moments found.
          </p>
        ) : (
          filteredMoments.map((moment) => (
            <div
              key={moment._id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm relative group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[moment.category]}`}
                  >
                    {moment.category.replace("_", " ")}
                  </span>
                  <button
                    onClick={() =>
                      onJumpToTime && onJumpToTime(moment.startTime)
                    }
                    className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-mono"
                  >
                    {formatTime
                      ? formatTime(moment.startTime)
                      : moment.startTime + "s"}
                  </button>
                </div>
                {moment.userId._id === user?._id && (
                  <button
                    onClick={() => removeMoment(moment._id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete moment"
                  >
                    &times;
                  </button>
                )}
              </div>

              <blockquote className="text-sm text-gray-700 italic border-l-2 border-gray-300 pl-2 my-2">
                "{moment.snippet}"
              </blockquote>

              {moment.note && (
                <p className="text-sm text-gray-600 mt-2">{moment.note}</p>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                {moment.userId.profilePicture ? (
                  <img
                    src={moment.userId.profilePicture}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    {moment.userId.name?.charAt(0) || "U"}
                  </div>
                )}
                <span>{moment.userId.name}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 bg-primary-50 text-primary-600 border border-primary-200 rounded-md hover:bg-primary-100 font-medium text-sm transition-colors"
          >
            + Add Key Moment
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Snippet
              </label>
              <textarea
                required
                maxLength={500}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                rows={2}
                value={newMoment.snippet}
                onChange={(e) =>
                  setNewMoment({ ...newMoment, snippet: e.target.value })
                }
                placeholder="Highlight text from transcript..."
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={newMoment.category}
                  onChange={(e) =>
                    setNewMoment({ ...newMoment, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Time (s)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={newMoment.startTime}
                  onChange={(e) =>
                    setNewMoment({
                      ...newMoment,
                      startTime: Number(e.target.value),
                      endTime: Number(e.target.value) + 10,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={newMoment.note}
                onChange={(e) =>
                  setNewMoment({ ...newMoment, note: e.target.value })
                }
                placeholder="Add context..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
