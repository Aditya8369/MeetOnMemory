import React, { useState, useEffect } from "react";
import api from "../services/apiClient.js";

const StandupReports = () => {
  const [activeTab, setActiveTab] = useState("my");
  const [myReports, setMyReports] = useState([]);
  const [teamReports, setTeamReports] = useState([]);
  const [preferences, setPreferences] = useState({
    scheduleType: "daily",
    timeOfDay: "09:00",
    deliveryChannels: [],
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPreferences();
    fetchMyReports();
    // Assuming team reports can be fetched by anyone for now based on the plan
    fetchTeamReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      const res = await api.get("/api/standups/my");
      setMyReports(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch my reports", err);
    }
  };

  const fetchTeamReports = async () => {
    try {
      const res = await api.get("/api/standups/team");
      setTeamReports(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch team reports", err);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get("/api/standups/preferences");
      if (res.data.data) {
        setPreferences(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch preferences", err);
    }
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setPreferences((prev) => {
        const channels = prev.deliveryChannels.filter((c) => c !== name);
        if (checked) channels.push(name);
        return { ...prev, deliveryChannels: channels };
      });
    } else {
      setPreferences((prev) => ({ ...prev, [name]: value }));
    }
  };

  const savePreferences = async () => {
    try {
      setLoading(true);
      await api.put("/api/standups/preferences", preferences);
      alert("Preferences saved successfully!");
    } catch (err) {
      console.error("Failed to save preferences", err);
      alert("Failed to save preferences.");
    } finally {
      setLoading(false);
    }
  };

  const generateManualReport = async () => {
    try {
      setGenerating(true);
      await api.post("/api/standups/generate", { type: "daily" });
      await fetchMyReports();
      alert("Report generated successfully!");
    } catch (err) {
      console.error("Failed to generate report", err);
      alert("Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const renderReportCard = (report) => (
    <div
      key={report._id}
      className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm"
    >
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          {report.user?.displayName || "My"} Standup (
          {new Date(report.date).toLocaleDateString()}) - {report.type}
        </h2>
      </div>

      <div className="mb-4">
        <strong className="block text-gray-700 mb-2">AI Summary:</strong>
        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {report.aiSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <strong className="block text-gray-700 mb-1">
            Completed Items ({report.completedActionItems?.length || 0})
          </strong>
          <ul className="list-disc ml-5 text-gray-600">
            {report.completedActionItems?.map((item, idx) => (
              <li key={idx}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong className="block text-gray-700 mb-1">
            Upcoming Items ({report.upcomingActionItems?.length || 0})
          </strong>
          <ul className="list-disc ml-5 text-gray-600">
            {report.upcomingActionItems?.map((item, idx) => (
              <li key={idx}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong className="block text-gray-700 mb-1">
            Blockers ({report.blockers?.length || 0})
          </strong>
          <ul className="list-disc ml-5 text-gray-600">
            {report.blockers?.map((item, idx) => (
              <li key={idx} className="text-red-500">
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong className="block text-gray-700 mb-1">
            Meetings Attended ({report.attendedMeetings?.length || 0})
          </strong>
          <ul className="list-disc ml-5 text-gray-600">
            {report.attendedMeetings?.map((item, idx) => (
              <li key={idx}>{item.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Async Standup Reports
        </h1>
        {activeTab === "my" && (
          <button
            onClick={generateManualReport}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Report Now"}
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium border-b-2 ${activeTab === "my" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-blue-600"}`}
          onClick={() => setActiveTab("my")}
        >
          My Standup
        </button>
        <button
          className={`py-2 px-4 font-medium border-b-2 ${activeTab === "team" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-blue-600"}`}
          onClick={() => setActiveTab("team")}
        >
          Team Standups
        </button>
        <button
          className={`py-2 px-4 font-medium border-b-2 ${activeTab === "preferences" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-blue-600"}`}
          onClick={() => setActiveTab("preferences")}
        >
          Preferences
        </button>
      </div>

      {activeTab === "my" && (
        <div>
          {myReports.length === 0 ? (
            <p className="text-gray-500">No reports found.</p>
          ) : (
            myReports.map(renderReportCard)
          )}
        </div>
      )}

      {activeTab === "team" && (
        <div>
          {teamReports.length === 0 ? (
            <p className="text-gray-500">No team reports found.</p>
          ) : (
            teamReports.map(renderReportCard)
          )}
        </div>
      )}

      {activeTab === "preferences" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Automated Generation Preferences
          </h2>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Schedule Type
            </label>
            <select
              name="scheduleType"
              value={preferences.scheduleType}
              onChange={handlePreferenceChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="none">None (Manual Only)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Time of Day
            </label>
            <input
              type="time"
              name="timeOfDay"
              value={preferences.timeOfDay}
              onChange={handlePreferenceChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Delivery Channels
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                name="email"
                id="pref-email"
                checked={preferences.deliveryChannels.includes("email")}
                onChange={handlePreferenceChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="pref-email" className="text-gray-700">
                Email
              </label>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                name="slack"
                id="pref-slack"
                checked={preferences.deliveryChannels.includes("slack")}
                onChange={handlePreferenceChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="pref-slack" className="text-gray-700">
                Slack
              </label>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                name="in-app"
                id="pref-in-app"
                checked={preferences.deliveryChannels.includes("in-app")}
                onChange={handlePreferenceChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="pref-in-app" className="text-gray-700">
                In-App (No push notification)
              </label>
            </div>
          </div>
          <button
            onClick={savePreferences}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      )}
    </div>
  );
};

export default StandupReports;
