import cron from "node-cron";
import MeetingChecklist from "../models/meetingChecklistModel.js";
import Meeting from "../models/meetingModel.js";
import eventBus from "../services/eventBus.js";

const processChecklistReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000); // 1 hour window

    // Find meetings happening in ~24h
    const upcomingMeetings = await Meeting.find({
      date: {
        $gte: tomorrow.toISOString(),
        $lt: tomorrowEnd.toISOString(),
      },
      status: { $ne: "cancelled" },
    });

    for (const meeting of upcomingMeetings) {
      const checklist = await MeetingChecklist.findOne({
        meetingId: meeting._id,
      });
      if (!checklist || checklist.items.length === 0) continue;

      // Group completions to find who hasn't completed everything
      const totalItems = checklist.items.length;

      const userCompletions = checklist.completions.reduce((acc, comp) => {
        const uid = comp.userId.toString();
        if (!acc[uid]) acc[uid] = 0;
        acc[uid]++;
        return acc;
      }, {});

      for (const participant of meeting.participants) {
        const uid = participant.userId?.toString();
        if (!uid) continue;

        const completedCount = userCompletions[uid] || 0;

        if (completedCount < totalItems) {
          eventBus.emit("notification:created", {
            type: "checklist_reminder",
            userId: uid,
            data: {
              meetingId: meeting._id,
              meetingTitle: meeting.title,
              message: `You have incomplete preparation tasks for the upcoming meeting: ${meeting.title}`,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in checklistReminderJob:", error);
  }
};

export const initChecklistReminderJob = () => {
  // Run every hour
  cron.schedule("0 * * * *", processChecklistReminders);
};
