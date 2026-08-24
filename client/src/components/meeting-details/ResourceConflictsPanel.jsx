import React, { useEffect, useState } from "react";
import { AlertTriangle, Building2, CalendarX, Info } from "lucide-react";
import resourceBookingApi from "../../services/resourceBookingApi";
import { buildScheduleSlot } from "../../pages/CreateMeeting/utils/scheduleConflicts";

const ResourceConflictsPanel = ({ meeting }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    if (!meeting?._id) return;

    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await resourceBookingApi.getMeetingBookings(meeting._id);
        if (!cancelled && data.success) {
          setBookings(data.bookings);
        }
      } catch (err) {
        console.error("Failed to fetch meeting resource bookings", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBookings();

    return () => {
      cancelled = true;
    };
  }, [meeting]);

  useEffect(() => {
    if (!meeting || bookings.length === 0) {
      setConflicts([]);
      return;
    }

    const slot = buildScheduleSlot(
      meeting.date,
      meeting.time,
      meeting.duration,
    );
    if (!slot) return;

    const currentStart = slot.start.toISOString();
    const currentEnd = slot.end.toISOString();

    const newConflicts = bookings.filter((booking) => {
      const bookingStart = new Date(booking.startTime).toISOString();
      const bookingEnd = new Date(booking.endTime).toISOString();
      // If the meeting time has shifted, but the booking was made for a different time, flag it.
      // We don't automatically update the booking time when meeting time changes to prevent double-booking silently.
      return bookingStart !== currentStart || bookingEnd !== currentEnd;
    });

    setConflicts(newConflicts);
  }, [meeting, bookings]);

  if (loading || (bookings.length === 0 && conflicts.length === 0)) return null;

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="text-gray-500 dark:text-gray-400" size={20} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Physical Resources
        </h3>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertTriangle
            className="text-red-600 dark:text-red-500 shrink-0 mt-0.5"
            size={20}
          />
          <div>
            <h4 className="text-sm font-bold text-red-900 dark:text-red-400 mb-1">
              Resource Timing Conflict
            </h4>
            <p className="text-xs text-red-700 dark:text-red-300">
              The meeting time has changed, but the following resources are
              still booked for the old time. Please re-book or cancel them.
            </p>
            <ul className="mt-2 space-y-1">
              {conflicts.map((c) => (
                <li
                  key={c._id}
                  className="text-xs font-semibold text-red-800 dark:text-red-200 flex items-center gap-1.5"
                >
                  <CalendarX size={14} />
                  {c.resource?.name || "Unknown Resource"} (
                  {new Date(c.startTime).toLocaleTimeString()} -{" "}
                  {new Date(c.endTime).toLocaleTimeString()})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {bookings.length > 0 && conflicts.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-800"
            >
              <span className="font-semibold">
                {b.resource?.name || "Unknown Resource"}
              </span>
              <span className="text-xs opacity-80 capitalize">
                ({b.resource?.type || "unknown"})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceConflictsPanel;
