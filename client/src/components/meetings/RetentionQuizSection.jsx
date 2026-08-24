import React, { useEffect, useState } from "react";
import { useMeetingQuiz } from "../../hooks/useMeetingQuiz";
import RetentionQuizModal from "./RetentionQuizModal";
import { BookOpen, AlertCircle, TrendingUp } from "lucide-react";

const RetentionQuizSection = ({ meeting, isOrganizer }) => {
  const { quizData, analytics, loading, fetchQuiz, fetchAnalytics } =
    useMeetingQuiz(meeting._id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyticsVisible, setIsAnalyticsVisible] = useState(false);

  useEffect(() => {
    // Only try to fetch if we think there might be a quiz
    if (meeting.requireQuiz || meeting.status === "completed") {
      fetchQuiz();
      if (isOrganizer) {
        fetchAnalytics();
      }
    }
  }, [
    meeting._id,
    meeting.requireQuiz,
    meeting.status,
    isOrganizer,
    fetchQuiz,
    fetchAnalytics,
  ]);

  if (loading && !quizData) {
    return null; // hide while loading initial state
  }

  // If there's no quiz generated yet
  if (!quizData || !quizData.quiz) {
    return null;
  }

  const { response } = quizData;
  const isCompleted = !!response;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6 mb-6 overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Knowledge Retention Quiz
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isCompleted
                ? "You have already completed the quiz for this meeting."
                : "Test your knowledge on this meeting's key takeaways."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2 ${
                isCompleted
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isCompleted ? "View Results" : "Take Quiz"}
            </button>

            {isOrganizer && (
              <button
                onClick={() => setIsAnalyticsVisible(!isAnalyticsVisible)}
                className="px-4 py-2 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 transition-colors text-sm flex items-center gap-2 border border-purple-200 dark:border-purple-800"
              >
                <TrendingUp className="w-4 h-4" />
                {isAnalyticsVisible ? "Hide Analytics" : "View Analytics"}
              </button>
            )}
          </div>
        </div>

        {isOrganizer && isAnalyticsVisible && analytics && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quiz Analytics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Participants
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.totalParticipants}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Average Score
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.averageScore}%
                </p>
              </div>
            </div>

            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
              Frequently Missed Questions
            </h4>
            {analytics.questionStats && analytics.questionStats.length > 0 ? (
              <div className="space-y-3">
                {analytics.questionStats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800"
                  >
                    <span className="text-gray-700 dark:text-gray-300 text-sm truncate flex-1 pr-4">
                      {stat.questionText}
                    </span>
                    <span
                      className={`text-sm font-medium px-2 py-1 rounded ${stat.missRate > 50 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}
                    >
                      {stat.missRate}% missed
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No data available yet.
              </p>
            )}
          </div>
        )}
      </div>

      <RetentionQuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        meetingId={meeting._id}
        quizData={quizData}
        onSubmitSuccess={() => {
          // Re-fetch analytics if organizer so they see updated stats
          if (isOrganizer) {
            fetchAnalytics();
          }
        }}
      />
    </div>
  );
};

export default RetentionQuizSection;
