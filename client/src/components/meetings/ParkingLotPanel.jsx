import React, { useState } from "react";
import { toast } from "react-toastify";
import { parkingLotApi } from "../../services";

const ParkingLotPanel = ({ organizationId, meetingId }) => {
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    try {
      setSubmitting(true);
      const { data } = await parkingLotApi.addTopic({
        organizationId,
        sourceMeetingId: meetingId,
        topic,
      });

      if (data.success) {
        toast.success("Added to Parking Lot!");
        setTopic("");
      }
    } catch (error) {
      console.error("Failed to add to parking lot:", error);
      toast.error("Failed to add topic to parking lot.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Parking Lot
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Save off-topic ideas for future meetings.
        </p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            rows="4"
            placeholder="What's the off-topic idea?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={!topic.trim() || submitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Add to Parking Lot"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ParkingLotPanel;
