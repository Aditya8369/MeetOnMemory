import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Calendar, ArrowRight } from "lucide-react";
import meetingRsvpApi from "../../services/meetingRsvpApi";

const PendingRsvpBanner = () => {
  const [pendingRsvps, setPendingRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingRsvps = async () => {
      try {
        const { data } = await meetingRsvpApi.getPendingRsvps();
        if (data.success) {
          setPendingRsvps(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch pending RSVPs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRsvps();
  }, []);

  if (loading || pendingRsvps.length === 0) return null;

  return (
    <div className="mb-6 fade-in-up">
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">
              Action Required: Pending RSVPs
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              You have {pendingRsvps.length} meeting
              {pendingRsvps.length > 1 ? "s" : ""} awaiting your response.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {pendingRsvps.slice(0, 2).map((rsvp) => (
            <button
              key={rsvp._id}
              onClick={() => navigate(`/meeting/${rsvp.meetingId._id}`)}
              className="flex items-center justify-between gap-4 px-3 py-2 bg-white rounded border border-amber-200 hover:bg-amber-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Calendar className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-900 truncate max-w-[200px]">
                  {rsvp.meetingId.title}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
            </button>
          ))}
          {pendingRsvps.length > 2 && (
            <button
              onClick={() => navigate("/rsvps")}
              className="text-xs text-amber-700 font-medium text-center hover:underline bg-transparent"
            >
              + {pendingRsvps.length - 2} more (View Inbox)
            </button>
          )}
          {pendingRsvps.length <= 2 && pendingRsvps.length > 0 && (
            <button
              onClick={() => navigate("/rsvps")}
              className="text-xs text-amber-700 font-medium text-center hover:underline bg-transparent mt-1"
            >
              Open RSVP Inbox
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingRsvpBanner;
