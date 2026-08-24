import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import teamAvailabilityApi from "../services/teamAvailabilityApi";
import AvailabilityPreferencesForm from "../components/meetings/AvailabilityPreferencesForm";
import Navbar from "../components/Navbar.jsx";

const TeamAvailability = () => {
  const [activeTab, setActiveTab] = useState("heatmap"); // 'heatmap', 'slots', 'preferences'

  // Heatmap State
  const [heatmapData, setHeatmapData] = useState([]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Free Slots State
  const [userIdsInput, setUserIdsInput] = useState("");
  const [duration, setDuration] = useState(30);
  const [freeSlots, setFreeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "heatmap") {
      fetchHeatmap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeTab]);

  const fetchHeatmap = async () => {
    setHeatmapLoading(true);
    try {
      const data = await teamAvailabilityApi.getHeatmapData(startDate, endDate);
      setHeatmapData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHeatmapLoading(false);
    }
  };

  const handleFindSlots = async (e) => {
    e.preventDefault();
    setSlotsLoading(true);
    try {
      const uIds = userIdsInput
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id);
      const data = await teamAvailabilityApi.findFreeSlots(
        uIds,
        duration,
        startDate,
        endDate,
      );
      setFreeSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Helper to determine cell color based on density
  const getDensityColor = (density) => {
    if (density === 0)
      return "bg-green-100 hover:bg-green-200 border-green-200";
    if (density <= 2)
      return "bg-yellow-200 hover:bg-yellow-300 border-yellow-300";
    if (density <= 4)
      return "bg-orange-300 hover:bg-orange-400 border-orange-400";
    return "bg-red-400 hover:bg-red-500 border-red-500";
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 flex flex-col">
        <button
          onClick={() => navigate("/calendar")}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 mb-6 text-sm font-semibold transition-colors cursor-pointer self-start"
        >
          <ArrowLeft size={16} /> Back to calendar
        </button>

        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 flex items-center gap-2.5">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Team Availability
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
              Visualize team capacity and find the perfect time.
            </p>
          </div>
          <div className="flex gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-4 py-2 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
            />
            <span className="self-center font-medium text-slate-500 dark:text-slate-400">
              to
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-4 py-2 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
            />
          </div>
        </header>

        {/* Custom Tabs */}
        <div className="flex gap-2 mb-8 bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm w-max border border-slate-100 dark:border-slate-800">
          {[
            { id: "heatmap", label: "Heatmap" },
            { id: "slots", label: "Find Free Slot" },
            { id: "preferences", label: "Preferences" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 backdrop-blur-lg bg-opacity-90">
          {/* HEATMAP TAB */}
          {activeTab === "heatmap" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">
                Weekly Utilization Heatmap
              </h2>
              {heatmapLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-gray-200 dark:border-gray-800">
                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-24 border-r border-gray-200 dark:border-gray-850">
                          Time
                        </th>
                        {heatmapData.map((day) => (
                          <th
                            key={day.date}
                            className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[120px] border-l border-gray-200 dark:border-gray-800"
                          >
                            {new Date(day.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Render hours 8 AM to 8 PM for brevity in UI */}
                      {Array.from({ length: 13 }, (_, i) => i + 8).map(
                        (hour) => (
                          <tr
                            key={hour}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-3 text-sm text-slate-500 dark:text-slate-400 font-medium sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-gray-200 dark:border-gray-800">
                              {hour === 12
                                ? "12 PM"
                                : hour > 12
                                  ? `${hour - 12} PM`
                                  : `${hour} AM`}
                            </td>
                            {heatmapData.map((day) => {
                              const hData = day.hours.find(
                                (h) => h.hour === hour,
                              ) || { density: 0, busyUsers: [] };
                              return (
                                <td
                                  key={`${day.date}-${hour}`}
                                  className="p-2 border-l border-slate-100 dark:border-slate-800"
                                >
                                  <div
                                    className={`relative group h-12 rounded-lg border flex items-center justify-center transition-all duration-300 ${getDensityColor(hData.density)}`}
                                  >
                                    <span className="text-xs font-semibold opacity-70">
                                      {hData.density > 0
                                        ? `${hData.density} Busy`
                                        : "Free"}
                                    </span>

                                    {/* Tooltip */}
                                    {hData.busyUsers.length > 0 && (
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl">
                                        <div className="font-bold mb-1 border-b border-gray-700 pb-1">
                                          Busy Members:
                                        </div>
                                        <ul className="space-y-1">
                                          {hData.busyUsers.map((u, i) => (
                                            <li
                                              key={i}
                                              className="flex items-center gap-2"
                                            >
                                              <span
                                                className={`w-2 h-2 rounded-full ${u.type === "meeting" ? "bg-red-400" : "bg-purple-400"}`}
                                              ></span>
                                              <span className="truncate">
                                                {u.name} ({u.type})
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SLOTS TAB */}
          {activeTab === "slots" && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">
                Find Free Common Slots
              </h2>

              <form
                onSubmit={handleFindSlots}
                className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-xl border border-gray-200 dark:border-gray-800 mb-8 shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      User IDs (comma separated)
                    </label>
                    <input
                      type="text"
                      value={userIdsInput}
                      onChange={(e) => setUserIdsInput(e.target.value)}
                      placeholder="e.g. 60d5ecb..., 60d5ecb..."
                      required
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      In a real app, this would be a multi-select user dropdown.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Duration (Minutes)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={90}>1.5 Hours</option>
                      <option value={120}>2 Hours</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={slotsLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {slotsLoading ? "Searching..." : "Find Available Slots"}
                </button>
              </form>

              {freeSlots.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-800 pb-2">
                    Available Times
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {freeSlots.map((slot, i) => (
                      <div
                        key={i}
                        className="bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-sm text-green-800 dark:text-green-400 font-semibold mb-1">
                          {new Date(slot.start).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-lg text-green-900 dark:text-green-200 font-bold">
                          {new Date(slot.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {new Date(slot.end).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : slotsLoading ? null : (
                <div className="text-center p-12 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-350 dark:border-slate-800">
                  <div className="text-slate-400 dark:text-slate-600 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    No slots found or not searched yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="animate-fade-in">
              <AvailabilityPreferencesForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamAvailability;
