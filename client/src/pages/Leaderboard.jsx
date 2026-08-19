import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get("/api/gamification/leaderboard", {
          withCredentials: true,
        });
        if (response.data.success) {
          setLeaderboard(response.data.data);
        }
      } catch (error) {
        console.error("Failed to load leaderboard", error);
        toast.error("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Leaderboard...
      </div>
    );
  }

  if (!leaderboard || !leaderboard.top10) {
    return (
      <div className="p-8 text-center text-gray-500">
        No leaderboard data available.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-10">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center">
        🏆 Meeting Hygiene Leaderboard
      </h1>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Top 10 Meeting Heroes
        </h2>

        <ul className="space-y-4">
          {leaderboard.top10.map((score, index) => (
            <li
              key={score._id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-600"
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-gray-400">
                  #{index + 1}
                </span>
                <img
                  src={
                    score.user.profilePic || "https://via.placeholder.com/40"
                  }
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {score.user.name}
                </span>
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {score.totalPoints} pts
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Leaderboard;
