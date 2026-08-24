import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import meetingRsvpApi from "../services/meetingRsvpApi";
import { toast } from "react-toastify";

export default function RsvpInbox() {
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRsvps();
  }, []);

  const fetchRsvps = async () => {
    try {
      const { data } = await meetingRsvpApi.getAllRsvps();
      setRsvps(data || []);
    } catch (err) {
      console.error("Failed to retrieve meeting RSVPs:", err);
      toast.error("Failed to load invitations.");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (rsvp, decision) => {
    setProcessingId(rsvp.id);
    try {
      const payload = { status: decision.toLowerCase() };
      const note = notes[rsvp.id];

      if (note) {
        if (decision === "DECLINED") {
          payload.declineReason = note;
        } else {
          payload.availabilityNote = note;
        }
      }

      await meetingRsvpApi.respondToRsvp(rsvp.meetingId, payload);

      setRsvps((prev) =>
        prev.map((item) =>
          item.id === rsvp.id
            ? { ...item, status: decision, userNotes: note || "" }
            : item,
        ),
      );
      toast.success(`Invitation ${decision.toLowerCase()} successfully.`);
    } catch (err) {
      console.error("Error dispatching RSVP response action:", err);
      toast.error(err.response?.data?.message || "Failed to submit response.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleNoteChange = (id, val) => {
    setNotes((prev) => ({ ...prev, [id]: val }));
  };

  const pendingItems = rsvps.filter((item) => item.status === "PENDING");
  const pastItems = rsvps.filter((item) => item.status !== "PENDING");

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950 text-slate-400 text-sm">
        Loading invitation stream matrix...
      </div>
    );
  }

  return (
    <div className="rsvp-inbox-container min-h-screen bg-slate-950 text-white p-6 font-sans">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          📥 Meeting Invitation Inbox
        </h1>
        <p className="text-slate-400 text-xs">
          Review, track, and manage outstanding responses for your upcoming team
          calendars.
        </p>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {/* --- PENDING INVITATIONS SECTION --- */}
        <section aria-labelledby="pending-heading">
          <h2
            id="pending-heading"
            className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4"
          >
            Pending Actions ({pendingItems.length})
          </h2>

          {pendingItems.length === 0 ? (
            <div className="empty-state p-8 bg-slate-900 border border-dashed border-slate-800 rounded-xl text-center">
              <span className="text-2xl block mb-2">🎉</span>
              <h3 className="text-xs font-bold text-slate-300">
                All caught up!
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                No outstanding meeting prerequisites require your feedback right
                now.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="rsvp-card p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row justify-between gap-4 transition-all hover:border-slate-700"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                        Response Required
                      </span>
                      <Link
                        to={`/meetings/${rsvp.meetingId}`}
                        className="text-xs font-semibold text-blue-400 hover:underline block"
                      >
                        {rsvp.meetingTitle || "Untitled Shared Workspace Sync"}
                      </Link>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      📅 {rsvp.meetingDate} | ⏰ {rsvp.meetingTime}
                    </p>
                    <input
                      type="text"
                      placeholder="Add optional notes (e.g., Arriving 10m late)..."
                      value={notes[rsvp.id] || ""}
                      onChange={(e) =>
                        handleNoteChange(rsvp.id, e.target.value)
                      }
                      className="w-full mt-2 p-2 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleResponse(rsvp, "DECLINED")}
                      disabled={processingId === rsvp.id}
                      className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleResponse(rsvp, "ACCEPTED")}
                      disabled={processingId === rsvp.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-950/40 disabled:opacity-40"
                    >
                      Accept Invitation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- PAST RESPONSES ARCHIVE --- */}
        {pastItems.length > 0 && (
          <section aria-labelledby="history-heading">
            <h2
              id="history-heading"
              className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4"
            >
              Historical Responses Archive
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Meeting Title</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Your Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pastItems.map((rsvp) => (
                    <tr
                      key={rsvp.id}
                      className="border-b border-slate-800/40 hover:bg-slate-800/20"
                    >
                      <td className="p-3">
                        <Link
                          to={`/meetings/${rsvp.meetingId}`}
                          className="text-blue-400 hover:underline font-medium"
                        >
                          {rsvp.meetingTitle}
                        </Link>
                        {rsvp.userNotes && (
                          <p className="text-[10px] text-slate-500 italic font-normal mt-0.5">
                            Note: "{rsvp.userNotes}"
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {rsvp.meetingDate}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold uppercase tracking-wider text-[10px] ${
                            rsvp.status === "ACCEPTED"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          • {rsvp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
