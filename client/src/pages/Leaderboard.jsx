import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../services/apiClient";
import Navbar from "../components/Navbar.jsx";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await apiClient.get("/api/gamification/leaderboard");
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors flex flex-col">
        <Navbar />
        <div className="max-w-4xl mx-auto w-full pt-24 pb-20 px-4 sm:px-6 flex flex-col items-center justify-center flex-1">
          <div className="text-center text-gray-900 dark:text-gray-100 text-lg font-medium">
            Loading Leaderboard...
          </div>
        </div>
      </div>
    );
  }

  if (!leaderboard || !leaderboard.top10) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors flex flex-col">
        <Navbar />
        <div className="max-w-4xl mx-auto w-full pt-24 pb-20 px-4 sm:px-6 flex flex-col items-center justify-center flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700 w-full text-center text-gray-900 dark:text-gray-100">
            No leaderboard data available.
          </div>
          <Link
            to="/badges"
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Browse badges gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors flex flex-col">
      <Navbar />
      <div className="max-w-4xl mx-auto w-full pt-24 pb-20 px-4 sm:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center sm:text-left">
              🏆 Meeting Hygiene Leaderboard
            </h1>
            <Link
              to="/badges"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Browse badges gallery
            </Link>
          </div>

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
                        score.user.profilePic ||
                        "https://via.placeholder.com/40"
                      }
                      alt="Profile"
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      {score.user.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {score.totalPoints} pts
                    </div>
                    <Link
                      to="/badges"
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View badges
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
