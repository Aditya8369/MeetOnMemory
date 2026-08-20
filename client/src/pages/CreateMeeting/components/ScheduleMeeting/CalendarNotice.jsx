import { CheckCircle } from "lucide-react";

const CalendarNotice = () => {
  return (
    <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
      <CheckCircle
        className="text-green-600 dark:text-green-400 flex-shrink-0"
        size={20}
      />
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <strong className="text-gray-900 dark:text-white">
          Auto Calendar Sync:
        </strong>{" "}
        This meeting will be automatically added to Google Calendar, Outlook,
        and participant calendars with email invites.
      </div>
    </div>
  );
};

export default CalendarNotice;
