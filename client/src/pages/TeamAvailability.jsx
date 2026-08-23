import React, { useState, useEffect } from "react";
import teamAvailabilityApi from "../services/teamAvailabilityApi";
import AvailabilityPreferencesForm from "../components/meetings/AvailabilityPreferencesForm";

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

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Team Availability
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Visualize team capacity and find the perfect time.
            </p>
          </div>
          <div className="flex gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="self-center font-medium text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </header>

        {/* Custom Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm w-max border border-gray-100">
          {[
            { id: "heatmap", label: "Heatmap" },
            { id: "slots", label: "Find Free Slot" },
            { id: "preferences", label: "Preferences" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 backdrop-blur-lg bg-opacity-90">
          {/* HEATMAP TAB */}
          {activeTab === "heatmap" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Weekly Utilization Heatmap
              </h2>
              {heatmapLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-inner">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-3 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-24 border-r border-gray-200">
                          Time
                        </th>
                        {heatmapData.map((day) => (
                          <th
                            key={day.date}
                            className="p-3 text-center font-semibold text-gray-700 min-w-[120px] border-l border-gray-200"
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
                            <td className="p-3 text-sm text-gray-500 font-medium sticky left-0 bg-white z-10 border-r border-gray-200">
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
                                  className="p-2 border-l border-gray-100"
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
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Find Free Common Slots
              </h2>

              <form
                onSubmit={handleFindSlots}
                className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      User IDs (comma separated)
                    </label>
                    <input
                      type="text"
                      value={userIdsInput}
                      onChange={(e) => setUserIdsInput(e.target.value)}
                      placeholder="e.g. 60d5ecb..., 60d5ecb..."
                      required
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      In a real app, this would be a multi-select user dropdown.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (Minutes)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
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
                  <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                    Available Times
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {freeSlots.map((slot, i) => (
                      <div
                        key={i}
                        className="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-sm text-green-800 font-semibold mb-1">
                          {new Date(slot.start).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-lg text-green-900 font-bold">
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
                <div className="text-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <div className="text-gray-400 mb-2">
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
                  <p className="text-gray-500 font-medium">
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
