import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { meetingChecklistApi } from "../../services/meetingChecklistApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const PrepChecklist = ({ meeting, currentUser }) => {
  const [checklist, setChecklist] = useState(null);
  const [readiness, setReadiness] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Organizer state
  const [newItemText, setNewItemText] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [itemsToCreate, setItemsToCreate] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await meetingChecklistApi.getChecklist(meeting._id);
      if (res.data?.data?.checklist) {
        setChecklist(res.data.data.checklist);
        if (
          meeting.owner === currentUser.id ||
          meeting.owner === currentUser._id
        ) {
          const readinessRes = await meetingChecklistApi.getReadiness(
            meeting._id,
          );
          if (readinessRes.data?.data?.readiness) {
            setReadiness(readinessRes.data.data.readiness);
          }
        }
      } else {
        setChecklist(null);
      }
    } catch (err) {
      console.error("Failed to fetch checklist", err);
    } finally {
      setLoading(false);
    }
  }, [meeting, currentUser]);

  useEffect(() => {
    if (meeting && currentUser) {
      setIsOrganizer(
        meeting.owner === currentUser.id || meeting.owner === currentUser._id,
      );
      fetchData();
    }
  }, [meeting, currentUser, fetchData]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    setItemsToCreate([
      ...itemsToCreate,
      { text: newItemText, description: newItemDesc, required: false },
    ]);
    setNewItemText("");
    setNewItemDesc("");
  };

  const handleRemoveItemToCreate = (index) => {
    setItemsToCreate(itemsToCreate.filter((_, i) => i !== index));
  };

  const handleSaveChecklist = async () => {
    if (itemsToCreate.length === 0) return;

    try {
      setIsCreating(true);
      await meetingChecklistApi.createChecklist(meeting._id, {
        items: itemsToCreate,
      });
      toast.success("Checklist created successfully");
      setItemsToCreate([]);
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create checklist",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleItem = async (index) => {
    try {
      // Optimistic update
      const userId = currentUser.id || currentUser._id;
      const isCompleted = isItemCompleted(index);

      let newCompletions = [...(checklist.completions || [])];
      if (isCompleted) {
        newCompletions = newCompletions.filter(
          (c) => !(c.itemIndex === index && c.userId === userId),
        );
      } else {
        newCompletions.push({ itemIndex: index, userId });
      }

      setChecklist({ ...checklist, completions: newCompletions });

      // API call
      await meetingChecklistApi.toggleItem(meeting._id, index);
    } catch (err) {
      // Revert on error
      // Note: fetchData is now in useEffect, so we might need a different way to revert,
      // but for now just logging the error and showing toast
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const isItemCompleted = (index) => {
    const userId = currentUser.id || currentUser._id;
    return (
      checklist?.completions?.some(
        (c) => c.itemIndex === index && c.userId === userId,
      ) || false
    );
  };

  const isPastMeeting = new Date(meeting.date) < new Date();

  if (loading) {
    return (
      <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
    );
  }

  // View: No checklist, not organizer
  if (!checklist && !isOrganizer) {
    return null;
  }

  // View: No checklist, is organizer
  if (!checklist && isOrganizer) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="text-blue-500 w-5 h-5" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preparation Checklist
          </h3>
        </div>

        {isPastMeeting ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Cannot create checklist for past meetings.
          </p>
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Add tasks for participants to complete before the meeting.
            </p>

            <form onSubmit={handleAddItem} className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Task description (e.g., Review Q2 report)"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional details..."
                  className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-sm font-medium hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </form>

            {itemsToCreate.length > 0 && (
              <div className="space-y-4">
                <div className="border border-gray-100 dark:border-gray-700 rounded-md divide-y divide-gray-100 dark:divide-gray-700">
                  {itemsToCreate.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 flex justify-between items-start"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.text}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItemToCreate(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveChecklist}
                  disabled={isCreating}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {isCreating
                    ? "Saving..."
                    : "Save Checklist & Notify Participants"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // View: Has checklist
  const totalItems = checklist.items.length;
  const userCompletedCount = checklist.items.filter((_, idx) =>
    isItemCompleted(idx),
  ).length;
  const userProgress = Math.round((userCompletedCount / totalItems) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-blue-500 w-5 h-5" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preparation Checklist
          </h3>
        </div>

        {/* User Progress Indicator */}
        {!isOrganizer && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Your Progress:
            </div>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-gray-200 dark:text-gray-700"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className={`${userProgress === 100 ? "text-green-500" : "text-blue-500"}`}
                  strokeDasharray={`${userProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <span className="absolute text-[10px] font-medium">
                {userProgress}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks */}
        <div
          className={`space-y-3 ${isOrganizer ? "lg:col-span-2" : "lg:col-span-3"}`}
        >
          {checklist.items.map((item, index) => {
            const completed = isItemCompleted(index);
            return (
              <div
                key={index}
                className={`p-4 border rounded-lg transition-colors flex gap-3 ${
                  completed
                    ? "bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700"
                    : "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                }`}
              >
                <button
                  onClick={() => handleToggleItem(index)}
                  disabled={isPastMeeting}
                  className={`mt-0.5 flex-shrink-0 focus:outline-none ${isPastMeeting ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-blue-500" />
                  )}
                </button>
                <div
                  className={`${completed ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}
                >
                  <p className="text-sm font-medium leading-relaxed">
                    {item.text}
                  </p>
                  {item.description && (
                    <p
                      className={`text-xs mt-1 ${completed ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Readiness (Organizer Only) */}
        {isOrganizer && readiness.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-5 border border-gray-100 dark:border-gray-700 h-64 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300">
              <Users className="w-4 h-4" />
              <h4 className="font-medium text-sm">Team Readiness</h4>
            </div>

            <div className="flex-1 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={readiness}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    style={{ fill: "currentColor" }}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded shadow">
                            {`${data.completedCount} / ${data.totalItems} tasks completed`}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={12}>
                    {readiness.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.percentage === 100
                            ? "#10B981"
                            : entry.percentage > 0
                              ? "#3B82F6"
                              : "#E5E7EB"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrepChecklist;
