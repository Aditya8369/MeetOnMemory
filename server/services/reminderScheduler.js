import cron from "node-cron";
import ActionItem from "../models/actionItemModel.js";
import Meeting from "../models/meetingModel.js";
import NotificationPreference from "../models/notificationPreferenceModel.js";
import EmailService from "./EmailService.js";
import { createNotification } from "./notificationService.js";
import { checkQuietHours } from "../utils/quietHours.js";

class ReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.timezone = process.env.SCHEDULER_TIMEZONE || "UTC";
  }

  start() {
    if (this.isRunning) return;

    cron.schedule(
      "*/1 * * * *",
      async () => {
        console.log("[ReminderScheduler] Running reminder check...");

        try {
          await this.processMeetingReminders();
          await this.processDailyReminders();
        } catch (error) {
          console.error("[ReminderScheduler] Error:", error);
        }
      },
      { timezone: this.timezone },
    );

    this.isRunning = true;

    console.log(`[ReminderScheduler] Started with timezone: ${this.timezone}`);
  }

  /**
   * Sends reminders for meetings whose configured reminder time
   * has been reached.
   *
   * Supported reminder intervals:
   * - 10 minutes
   * - 30 minutes
   * - 60 minutes
   */
  async processMeetingReminders() {
    const now = new Date();

    try {
      const meetings = await Meeting.find({
        reminderEnabled: true,
        reminderSentAt: null,
        deletedAt: null,
        status: { $ne: "failed" },
      }).populate("uploadedBy", "name email");

      for (const meeting of meetings) {
        try {
          if (!meeting.date || !meeting.time) continue;

          const meetingDateTime = this.getMeetingDateTime(
            meeting.date,
            meeting.time,
          );

          if (!meetingDateTime) continue;

          const reminderMinutes = Number(meeting.reminderMinutesBefore);

          if (![10, 30, 60].includes(reminderMinutes)) continue;

          const reminderTime = new Date(
            meetingDateTime.getTime() - reminderMinutes * 60 * 1000,
          );

          /*
           * Send only when the reminder time has been reached,
           * but do not send reminders for meetings that have already started.
           */
          if (now >= reminderTime && now < meetingDateTime) {
            await this.sendMeetingReminder(
              meeting,
              reminderMinutes,
              meetingDateTime,
            );

            await Meeting.updateOne(
              {
                _id: meeting._id,
                reminderSentAt: null,
              },
              {
                $set: {
                  reminderSentAt: now,
                },
              },
            );
          }
        } catch (error) {
          console.error(
            `[ReminderScheduler] Error processing meeting ${meeting?._id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        "[ReminderScheduler] Error processing meeting reminders:",
        error,
      );
    }
  }

  /**
   * Converts meeting date + time into a JavaScript Date.
   */
  getMeetingDateTime(date, time) {
    if (!date || !time) return null;

    const meetingDate = new Date(date);

    if (Number.isNaN(meetingDate.getTime())) {
      return null;
    }

    const [hours, minutes] = String(time)
      .split(":")
      .map((value) => Number(value));

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    meetingDate.setHours(hours, minutes, 0, 0);

    return meetingDate;
  }

  /**
   * Sends both in-app and email meeting reminders.
   */
  async sendMeetingReminder(meeting, reminderMinutes, meetingDateTime) {
    const recipients = [];

    if (meeting.uploadedBy?.email) {
      recipients.push({
        userId: meeting.uploadedBy._id,
        name: meeting.uploadedBy.name,
        email: meeting.uploadedBy.email,
      });
    }

    for (const participant of meeting.participants || []) {
      if (!participant.email) continue;

      /*
       * Avoid sending the same reminder twice if the organizer
       * is also present in participants.
       */
      const alreadyAdded = recipients.some(
        (recipient) => String(recipient.userId) === String(participant.user),
      );

      if (!alreadyAdded && participant.user) {
        recipients.push({
          userId: participant.user,
          name: participant.name || "there",
          email: participant.email,
        });
      }
    }

    if (recipients.length === 0) return;

    const meetingTitle = meeting.title || "Scheduled Meeting";

    const subject = `🔔 Reminder: "${meetingTitle}" starts in ${reminderMinutes} minutes`;

    const description = `Your meeting "${meetingTitle}" starts in ${reminderMinutes} minutes.`;

    for (const recipient of recipients) {
      try {
        const inQuietHours = await checkQuietHours(recipient.userId);
        if (inQuietHours) {
          console.log(
            `[ReminderScheduler] Suppressing meeting reminder for ${recipient.email} due to quiet hours.`,
          );
          continue;
        }

        await createNotification({
          userId: recipient.userId,
          type: "meeting_reminder",
          title: subject,
          description,
          metadata: {
            meetingId: meeting._id,
            reminderMinutes,
            meetingDate: meetingDateTime,
          },
        });

        // Respect emailMeetingReminders preference (#2021)
        const notifPref = await NotificationPreference.findOne({
          user: recipient.userId,
        })
          .select("emailMeetingReminders")
          .lean();

        if (!notifPref || notifPref.emailMeetingReminders !== false) {
          await EmailService.sendMail({
            from: process.env.SENDER_EMAIL || "no-reply@meetonmemory.com",
            to: recipient.email,
            subject,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <p>Hi ${recipient.name || "there"},</p>
                <p>Your meeting <strong>${meetingTitle}</strong> starts in ${reminderMinutes} minutes.</p>
                <p><strong>When:</strong> ${meetingDateTime.toLocaleString()}</p>
              </div>
            `,
          });
        }
      } catch (error) {
        console.error(
          `[ReminderScheduler] Failed to notify ${recipient.email}:`,
          error,
        );
      }
    }
  }

  /**
   * Existing action-item reminder functionality.
   */
  async processDailyReminders() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const dates = {
      tomorrow: new Date(today),
      threeDays: new Date(today),
      sevenDays: new Date(today),
    };

    dates.tomorrow.setDate(today.getDate() + 1);
    dates.threeDays.setDate(today.getDate() + 3);
    dates.sevenDays.setDate(today.getDate() + 7);

    try {
      // 1. Overdue
      const overdueItems = await ActionItem.find({
        $or: [{ dueDate: { $lt: today } }, { deadline: { $lt: today } }],
        status: { $in: ["pending", "in_progress", "open", "in-progress"] },
        "remindersSent.type": { $ne: "overdue" },
      })
        .populate("assignee", "name email")
        .populate("assignedBy", "name");

      for (const item of overdueItems) {
        await this.sendReminder(item, "overdue");
      }

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

      for (const item of dueTodayItems) {
        await this.sendReminder(item, "due_today");
      }

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

      for (const item of threeDayItems) {
        await this.sendReminder(item, "3_day");
      }

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

      for (const item of sevenDayItems) {
        await this.sendReminder(item, "7_day");
      }
    } catch (error) {
      console.error("[ReminderScheduler] Error:", error);
    }
  }

  async sendReminder(item, type) {
    if (!item.assignee?.email) return;

    const inQuietHours = await checkQuietHours(item.assignee._id);
    if (inQuietHours) {
      console.log(
        `[ReminderScheduler] Suppressing action item reminder for ${item.assignee.email} due to quiet hours.`,
      );
      return;
    }

    const taskTitle = item.title || item.text;

    const subjectMap = {
      overdue: `🚨 OVERDUE: "${taskTitle}"`,
      due_today: `⏰ Due Today: "${taskTitle}"`,
      "3_day": `📅 Upcoming: "${taskTitle}" due in 3 days`,
      "7_day": `📅 Upcoming: "${taskTitle}" due next week`,
    };

    await createNotification({
      userId: item.assignee._id,
      type: "action_item_reminder",
      title: subjectMap[type],
    });

    // Respect emailTaskAssignments preference (#2021)
    const notifPref = await NotificationPreference.findOne({
      user: item.assignee._id,
    })
      .select("emailTaskAssignments")
      .lean();

    if (!notifPref || notifPref.emailTaskAssignments !== false) {
      await EmailService.sendMail({
        from: process.env.SENDER_EMAIL || "no-reply@meetonmemory.com",
        to: item.assignee.email,
        subject: subjectMap[type],
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <p>Hi ${item.assignee.name || "there"},</p>
            <p>${subjectMap[type]}</p>
            <p>Task: <strong>${taskTitle}</strong></p>
          </div>
        `,
      });
    }

    await ActionItem.updateOne(
      { _id: item._id },
      {
        $push: {
          remindersSent: {
            type,
            sentAt: new Date(),
          },
        },
      },
    );
  }
}

export default new ReminderScheduler();
