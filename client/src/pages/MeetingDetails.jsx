import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { meetingApi } from "../services";
import MeetingHeader from "../components/meeting-details/MeetingHeader";
import MeetingSummary from "../components/meeting-details/MeetingSummary";
import MeetingCollaborativeNotes from "../components/meeting-details/MeetingCollaborativeNotes";
import MeetingTranscript from "../components/meeting-details/MeetingTranscript";
import MeetingParticipants from "../components/meeting-details/MeetingParticipants";
import MeetingAgenda from "../components/meeting-details/MeetingAgenda";
import MeetingMetadata from "../components/meeting-details/MeetingMetadata";
import MeetingActions from "../components/meeting-details/MeetingActions";
import TranscriptAnnotations from "../components/meeting-details/TranscriptAnnotations";
import RsvpPanel from "../components/meeting-details/RsvpPanel";
import KeyMomentsPanel from "../components/meetings/KeyMomentsPanel";
import SentimentTimeline from "../components/meetings/SentimentTimeline";
import MeetingGoalsPanel from "../components/meetings/MeetingGoalsPanel";
import ShareModal from "../components/shared-links/ShareModal";
import MeetingFollowUpBanner from "../components/meeting-details/MeetingFollowUpBanner";
import PresentMode from "../components/meeting-details/PresentMode";
import PrepChecklist from "../components/meetings/PrepChecklist";
import SpeakingTimeBreakdown from "../components/meetings/SpeakingTimeBreakdown";
import CarryForwardConfig from "../components/meetings/CarryForwardConfig";
import DuplicateDetectionPanel from "../components/meeting-details/DuplicateDetectionPanel";
import MeetingTimeline from "../components/meeting-details/MeetingTimeline";
import RecapStoryViewer from "../components/summaries/RecapStoryViewer";
import { useUser } from "@clerk/clerk-react";
import BriefingBanner from "../components/meeting-details/BriefingBanner";
import { getBriefing } from "../services/briefingApi";

const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPresentModeOpen, setIsPresentModeOpen] = useState(false);
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [briefingStatus, setBriefingStatus] = useState("none");

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

        // Fetch briefing status
        try {
          const bData = await getBriefing(id);
          if (bData && bData.status) {
            setBriefingStatus(bData.status);
          }
        } catch (bErr) {
          // It's ok if it doesn't exist
          console.warn("Could not fetch briefing", bErr);
          setBriefingStatus("none");
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
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsStoryViewerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            Play Recap Story
          </button>
        </div>

        {meeting.date && new Date(meeting.date) > new Date() && (
          <BriefingBanner
            meetingId={meeting._id}
            briefingStatus={briefingStatus}
            onRegenerate={() => setBriefingStatus("pending")}
          />
        )}

        <DuplicateDetectionPanel meetingId={meeting._id} />
        <MeetingFollowUpBanner meeting={meeting} />
        <MeetingHeader
          meeting={meeting}
          onShare={() => setShareModalOpen(true)}
          onPresent={() => setIsPresentModeOpen(true)}
        />
        <MeetingSummary meeting={meeting} />
        <MeetingCollaborativeNotes meeting={meeting} />

        <div className="mt-6 mb-6">
          <MeetingTimeline meetingId={meeting._id} meeting={meeting} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 mb-6 overflow-hidden h-[500px]">
          <KeyMomentsPanel meetingId={meeting._id} />
        </div>

        <MeetingTranscript meeting={meeting} />
        <TranscriptAnnotations meeting={meeting} />

        <div className="mt-6 mb-6">
          <SentimentTimeline meetingId={meeting._id} />
        </div>

        {/* Speaking Time Analytics Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 mb-6 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2
              className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer"
              onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
            >
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <svg
                  className={`w-5 h-5 transform transition-transform ${isAnalyticsExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              Speaking Time Analytics
            </h2>
            <button
              onClick={() => navigate("/speaking-time-trends")}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              View My Trends →
            </button>
          </div>
          {isAnalyticsExpanded && (
            <SpeakingTimeBreakdown meetingId={meeting._id} />
          )}
        </div>

        <MeetingParticipants meeting={meeting} />
        <RsvpPanel
          meetingId={meeting._id}
          isOrganizer={
            currentUser?.publicMetadata?.dbUserId === meeting.uploadedBy
          }
          participants={meeting.participants}
        />
        <PrepChecklist meeting={meeting} currentUser={currentUser} />
        <MeetingGoalsPanel meeting={meeting} currentUser={currentUser} />

        {meeting.series && (
          <CarryForwardConfig
            seriesId={meeting.series._id || meeting.series}
            currentMeetingId={meeting._id}
            onApplySuccess={() => {
              // Reload meeting data to reflect new agenda items
              window.location.reload();
            }}
          />
        )}

        <MeetingAgenda meeting={meeting} />
        <MeetingMetadata meeting={meeting} />
        <MeetingActions
          meeting={meeting}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        resourceId={meeting._id}
        resourceType="Meeting"
        title={meeting.title}
      />

      {isPresentModeOpen && (
        <PresentMode
          meeting={meeting}
          onClose={() => setIsPresentModeOpen(false)}
        />
      )}

      {isStoryViewerOpen && (
        <RecapStoryViewer
          meetingId={meeting._id}
          onClose={() => setIsStoryViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default MeetingDetails;
