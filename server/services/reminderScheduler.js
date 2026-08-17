import cron from "node-cron";
import ActionItem from "../models/actionItemModel.js";
import emailService from "./emailService.js";
import notificationService from "./notificationService.js";

class ReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.timezone = process.env.SCHEDULER_TIMEZONE || "UTC";
  }

  start() {
    if (this.isRunning) return;
    cron.schedule(
      "0 8 * * *",
      async () => {
        console.log("[ReminderScheduler] Running daily reminder check...");
        await this.processDailyReminders();
      },
      { timezone: this.timezone },
    );
    this.isRunning = true;
  }

  async processDailyReminders() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const dates = {
      tomorrow: new Date(today).setDate(today.getDate() + 1),
      threeDays: new Date(today).setDate(today.getDate() + 3),
      sevenDays: new Date(today).setDate(today.getDate() + 7),
    };

    try {
      // 1. Overdue
      const overdueItems = await ActionItem.find({
        $or: [{ dueDate: { $lt: today } }, { deadline: { $lt: today } }],
        status: { $in: ["pending", "in_progress", "open", "in-progress"] },
        "remindersSent.type": { $ne: "overdue" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");
      for (const item of overdueItems) await this.sendReminder(item, "overdue");

      // 2. Due Today
      const dueTodayItems = await ActionItem.find({
        $or: [
          { dueDate: { $gte: today, $lt: dates.tomorrow } },
          { deadline: { $gte: today, $lt: dates.tomorrow } },
        ],
        status: { $in: ["pending", "in_progress", "open", "in-progress"] },
        "remindersSent.type": { $ne: "due_today" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");
      for (const item of dueTodayItems)
        await this.sendReminder(item, "due_today");

      // 3. Due in 3 Days (High/Urgent only)
      const threeDayItems = await ActionItem.find({
        $or: [
          { dueDate: { $gte: dates.tomorrow, $lt: dates.threeDays } },
          { deadline: { $gte: dates.tomorrow, $lt: dates.threeDays } },
        ],
        status: { $in: ["pending", "in_progress", "open", "in-progress"] },
        priority: { $in: ["high", "urgent"] },
        "remindersSent.type": { $ne: "3_day" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");
      for (const item of threeDayItems) await this.sendReminder(item, "3_day");

      // 4. Due in 7 Days (Urgent only)
      const sevenDayItems = await ActionItem.find({
        $or: [
          { dueDate: { $gte: dates.threeDays, $lt: dates.sevenDays } },
          { deadline: { $gte: dates.threeDays, $lt: dates.sevenDays } },
        ],
        status: { $in: ["pending", "in_progress", "open", "in-progress"] },
        priority: "urgent",
        "remindersSent.type": { $ne: "7_day" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");
      for (const item of sevenDayItems) await this.sendReminder(item, "7_day");
    } catch (error) {
      console.error("[ReminderScheduler] Error:", error);
    }
  }

  async sendReminder(item, type) {
    if (!item.assignee?.email) return;
    const taskTitle = item.title || item.text;
    const subjectMap = {
      overdue: `🚨 OVERDUE: "${taskTitle}"`,
      due_today: `⏰ Due Today: "${taskTitle}"`,
      "3_day": `📅 Upcoming: "${taskTitle}" due in 3 days`,
      "7_day": `📅 Upcoming: "${taskTitle}" due next week`,
    };

    await notificationService.create({
      userId: item.assignee._id,
      type: "action_item_reminder",
      title: subjectMap[type],
    });
    await emailService.send({
      to: item.assignee.email,
      subject: subjectMap[type],
      template: "actionItemReminder",
      data: { userName: item.assignee.name, taskTitle, type },
    });

    await ActionItem.updateOne(
      { _id: item._id },
      { $push: { remindersSent: { type, sentAt: new Date() } } },
    );
  }
}

export default new ReminderScheduler();
