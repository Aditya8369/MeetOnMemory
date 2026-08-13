const cron = require("node-cron");
const ActionItem = require("../models/ActionItem");
const emailService = require("./emailService"); // Assumed existing service
const notificationService = require("./notificationService"); // Assumed existing service

/**
 * @desc Background scheduler that runs daily to check for upcoming and overdue
 * action items, dispatching automated reminders via email and in-app notifications.
 */
class ReminderScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Initializes the cron jobs. Should be called once on server startup.
   */
  start() {
    if (this.isRunning) return;

    // Run every day at 8:00 AM
    cron.schedule(
      "0 8 * * *",
      async () => {
        console.log("[ReminderScheduler] Running daily reminder check...");
        await this.processDailyReminders();
      },
      {
        timezone: "America/New_York", // Adjust to your organization's primary timezone
      },
    );

    this.isRunning = true;
    console.log("[ReminderScheduler] Started successfully.");
  }

  /**
   * Main logic to find items needing reminders and dispatch them.
   */
  async processDailyReminders() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);

    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    try {
      // 1. Find Overdue Items (Deadline < Today, Status != Completed/Cancelled)
      const overdueItems = await ActionItem.find({
        deadline: { $lt: today },
        status: { $in: ["pending", "in_progress"] },
        "remindersSent.type": { $ne: "overdue_today" }, // Prevent spamming every day
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");

      for (const item of overdueItems) {
        await this.sendReminder(item, "overdue");
      }

      // 2. Find Items Due Today
      const dueTodayItems = await ActionItem.find({
        deadline: { $gte: today, $lt: tomorrow },
        status: { $in: ["pending", "in_progress"] },
        "remindersSent.type": { $ne: "due_today" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");

      for (const item of dueTodayItems) {
        await this.sendReminder(item, "due_today");
      }

      // 3. Find Items Due in 3 Days (Only for High/Urgent priority)
      const threeDayItems = await ActionItem.find({
        deadline: { $gte: tomorrow, $lt: threeDays },
        status: { $in: ["pending", "in_progress"] },
        priority: { $in: ["high", "urgent"] },
        "remindersSent.type": { $ne: "3_day" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");

      for (const item of threeDayItems) {
        await this.sendReminder(item, "3_day");
      }

      console.log(
        `[ReminderScheduler] Processed ${overdueItems.length + dueTodayItems.length + threeDayItems.length} reminders.`,
      );
    } catch (error) {
      console.error("[ReminderScheduler] Error processing reminders:", error);
    }
  }

  /**
   * Dispatches the actual reminder via email and in-app notification.
   */
  async sendReminder(item, type) {
    if (!item.assignee || !item.assignee.email) {
      console.warn(
        `[ReminderScheduler] No assignee email for item ${item._id}`,
      );
      return;
    }

    const subjectMap = {
      overdue: `🚨 OVERDUE: "${item.title}"`,
      due_today: `⏰ Due Today: "${item.title}"`,
      "3_day": `📅 Upcoming: "${item.title}" due in 3 days`,
      "7_day": `📅 Upcoming: "${item.title}" due next week`,
    };

    const subject = subjectMap[type] || `Reminder: ${item.title}`;

    // In-app notification
    await notificationService.create({
      userId: item.assignee._id,
      type: "action_item_reminder",
      title: subject,
      message: `Your task "${item.title}" is ${type === "overdue" ? "overdue" : "due soon"}.`,
      link: `/meetings/${item.meetingId}/actions`,
    });

    // Email notification (Assuming emailService handles templates)
    await emailService.send({
      to: item.assignee.email,
      subject,
      template: "actionItemReminder",
      data: {
        userName: item.assignee.name,
        taskTitle: item.title,
        deadline: item.deadline.toLocaleDateString(),
        priority: item.priority,
        type,
      },
    });

    // Record that we sent this reminder type to prevent duplicates
    await ActionItem.updateOne(
      { _id: item._id },
      { $push: { remindersSent: { type, sentAt: new Date() } } },
    );
  }
}

module.exports = new ReminderScheduler();
