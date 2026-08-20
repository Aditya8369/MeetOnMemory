import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { meetingApi } from "../services";
import MeetingHeader from "../components/meeting-details/MeetingHeader";
import MeetingSummary from "../components/meeting-details/MeetingSummary";
import MeetingCollaborativeNotes from "../components/meeting-details/MeetingCollaborativeNotes";
import MeetingTranscript from "../components/meeting-details/MeetingTranscript";
import MeetingParticipants from "../components/meeting-details/MeetingParticipants";
import MeetingMetadata from "../components/meeting-details/MeetingMetadata";
import MeetingActions from "../components/meeting-details/MeetingActions";
import MeetingFollowUpBanner from "../components/meeting-details/MeetingFollowUpBanner";

const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [briefingStatus, setBriefingStatus] = useState("idle"); // Status variants: 'idle' | 'generating' | 'ready' | 'failed'

  useEffect(() => {
    // Audit current baseline briefing properties upon mounting
    async function checkBriefingStatus() {
      try {
        const response = await fetch(`/api/meetings/${id}/briefing-status`);
        const data = await response.json();
        if (data.exists) setBriefingStatus("ready");
      } catch (err) {
        console.error("Error evaluating briefing baseline matrix:", err);
      }
    }
    checkBriefingStatus();
  }, [id]);

  const handleGenerateBriefing = async () => {
    setBriefingStatus("generating");
    try {
      const response = await fetch(`/api/meetings/${id}/briefing-generate`, {
        method: "POST",
      });
      if (response.ok) {
        setBriefingStatus("ready");
      } else {
        setBriefingStatus("failed");
      }
    } catch (err) {
      console.error("Failed to generate briefing:", err);
      setBriefingStatus("failed");
    }
  };

  useEffect(() => {
    const fetchMeetingDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await meetingApi.getMeetingById(id);
        if (data.success) {
          setMeeting(data.meeting);
        } else {
          setError(data.message || "Failed to fetch meeting details");
        }
      } catch (err) {
        console.error("Error fetching meeting details:", err);
        setError(
          err.response?.data?.message || "Failed to fetch meeting details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingDetails();
  }, [id]);

  const handleDelete = async (meetingId) => {
    try {
      const { data } = await meetingApi.deleteMeeting(meetingId);
      if (data.success) {
        toast.success("Meeting deleted successfully");
        navigate("/summaries");
      } else {
        toast.error(data.message || "Failed to delete meeting");
      }
    } catch (err) {
      console.error("Error deleting meeting:", err);
      toast.error(err.response?.data?.message || "Failed to delete meeting");
    }
  };

  const handleRename = async (meetingId, newTitle) => {
    try {
      const { data } = await meetingApi.updateMeeting(meetingId, {
        title: newTitle,
      });
      if (data.success) {
        toast.success("Meeting renamed successfully");
        setMeeting({ ...meeting, title: newTitle });
      } else {
        toast.error(data.message || "Failed to rename meeting");
      }
    } catch (err) {
      console.error("Error renaming meeting:", err);
      toast.error(err.response?.data?.message || "Failed to rename meeting");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-red-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Error Loading Meeting
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => navigate("/summaries")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Meetings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Meeting Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The meeting you're looking for doesn't exist.
              </p>
              <button
                onClick={() => navigate("/summaries")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Meetings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <MeetingFollowUpBanner meeting={meeting} />
        <MeetingHeader meeting={meeting} />

        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mt-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                AI Intelligence Core
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Parse discussion timelines, profile histories, and open action
                paths.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {briefingStatus === "generating" && (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                  <span className="w-3 h-3 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                  Synthesizing Briefing...
                </div>
              )}

              {briefingStatus === "failed" && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  ⚠️ Generation Failed
                </span>
              )}

              {briefingStatus === "ready" && (
                <button
                  onClick={() => navigate(`/meeting/${id}/briefing`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow transition"
                >
                  📖 Open Pre-Meeting Briefing
                </button>
              )}

              {(briefingStatus === "idle" || briefingStatus === "failed") && (
                <button
                  onClick={handleGenerateBriefing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow transition"
                >
                  ⚡ Generate Intelligent Brief
                </button>
              )}
            </div>
          </div>
        </div>

        <MeetingSummary meeting={meeting} />
        <MeetingCollaborativeNotes meeting={meeting} />
        <MeetingTranscript meeting={meeting} />
        <MeetingParticipants meeting={meeting} />
        <MeetingMetadata meeting={meeting} />
        <MeetingActions
          meeting={meeting}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      </div>
    </div>
  );
};

export default MeetingDetails;
