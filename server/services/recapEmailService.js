import RecapPreference from "../models/recapPreferenceModel.js";
import RecapDelivery from "../models/recapDeliveryModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import User from "../models/userModel.js";
import NotificationPreference from "../models/notificationPreferenceModel.js";
import EmailService from "./EmailService.js";
import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_BATCH_SIZE = 100;

class RecapEmailService {
  /**
   * Check if current time is within user's quiet hours
   */
  static isQuietHours(preferences, date = new Date()) {
    const { quietHoursStart, quietHoursEnd, timezone } = preferences;

    if (quietHoursStart == null || quietHoursEnd == null) return false;

    // Get current hour in user's timezone
    const tzDate = formatInTimeZone(
      date,
      timezone || "UTC",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    const currentHour = new Date(tzDate).getHours();

    if (quietHoursStart < quietHoursEnd) {
      return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
    } else {
      // Crosses midnight
      return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
    }
  }

  /**
   * Email-channel unsubscribe / disable checks (NotificationPreference).
   * Only skip when a preference document explicitly opts the user out —
   * missing docs keep historical RecapPreference-driven behaviour.
   */
  static async isEmailUnsubscribed(userId, timing) {
    const prefs = await NotificationPreference.findOne({ user: userId })
      .select("emailWeeklyDigest emailMeetingReminders")
      .lean();

    if (!prefs) return false;

    if (timing === "weekly" && prefs.emailWeeklyDigest === false) {
      return true;
    }

    // Daily batched recaps are meeting-related email; respect explicit opt-out.
    if (timing === "daily" && prefs.emailMeetingReminders === false) {
      return true;
    }

    return false;
  }

  /**
   * Build HTML for a single meeting recap
   */
  static async buildRecapHtml(meeting, preferences) {
    const { includeSummary, includeActionItems, includeTranscript } =
      preferences;
    let html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">`;

    const dateStr = meeting.date
      ? new Date(meeting.date).toLocaleDateString()
      : "Unknown Date";
    html += `<h2 style="color: #2563eb;">Meeting Recap: ${meeting.title}</h2>`;
    html += `<p style="color: #666;">Date: ${dateStr}</p>`;
    html += `<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />`;

    if (includeSummary && meeting.summary) {
      html += `<h3 style="color: #1e40af;">Summary</h3>`;
      html += `<p style="white-space: pre-wrap;">${meeting.summary}</p>`;
    }

    if (includeActionItems) {
      const actionItemFilter = { sourceMeetingId: meeting._id };
      if (meeting.organization) {
        actionItemFilter.organization = meeting.organization;
      }
      const actionItems = await ActionItem.find(actionItemFilter);
      if (actionItems.length > 0) {
        html += `<h3 style="color: #1e40af;">Action Items</h3><ul>`;
        actionItems.forEach((ai) => {
          html += `<li style="margin-bottom: 8px;">
            <strong>${ai.owner}:</strong> ${ai.text} 
            ${ai.dueDate ? `<em>(Due: ${new Date(ai.dueDate).toLocaleDateString()})</em>` : ""}
          </li>`;
        });
        html += `</ul>`;
      }
    }

    if (includeTranscript && meeting.transcript) {
      html += `<h3 style="color: #1e40af;">Transcript Snippet</h3>`;
      // truncate transcript
      const snippet =
        meeting.transcript.length > 500
          ? meeting.transcript.substring(0, 500) + "..."
          : meeting.transcript;
      html += `<div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; font-size: 14px; font-style: italic; white-space: pre-wrap;">${snippet}</div>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Send immediate recap for a processed meeting
   */
  static async sendImmediateRecap(meetingId) {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting || meeting.deletedAt) return;

      // Find all participants (users) in our system
      // Assuming participants are matched by email or uploadedBy is the only one we know for sure
      // Let's get the uploadedBy user and any other users linked via participants
      const participantEmails = meeting.participants
        .map((p) => p.email)
        .filter(Boolean);

      const userQuery = {
        $or: [
          { _id: meeting.uploadedBy },
          { email: { $in: participantEmails } },
        ],
      };
      // Keep recipients inside the meeting's organization when set (#1398).
      if (meeting.organization) {
        userQuery.organization = meeting.organization;
      }

      const usersToNotify = await User.find(userQuery);

      for (const user of usersToNotify) {
        try {
          // Check if already delivered
          const alreadyDelivered = await RecapDelivery.findOne({
            meetingId,
            userId: user._id,
          });
          if (alreadyDelivered && alreadyDelivered.status !== "failed") {
            continue;
          }

          // Get preferences
          let preferences = await RecapPreference.findOne({ userId: user._id });
          if (!preferences) {
            // Default preferences
            preferences = {
              deliveryTiming: "immediate",
              includeSummary: true,
              includeActionItems: true,
              includeTranscript: true,
              timezone: "UTC",
            };
          }

          if (preferences.deliveryTiming !== "immediate") continue;

          if (await this.isEmailUnsubscribed(user._id, "daily")) {
            console.log(
              `[RecapEmailService] Skipping immediate recap for ${user.email} due to email preference opt-out.`,
            );
            continue;
          }

          if (this.isQuietHours(preferences)) {
            console.log(
              `[RecapEmailService] Deferring immediate recap for ${user.email} due to quiet hours.`,
            );
            continue; // Will be picked up by a batch job later
          }

          const html = await this.buildRecapHtml(meeting, preferences);

          await EmailService.sendMail({
            from: process.env.SENDER_EMAIL || "no-reply@meetonmemory.com",
            to: user.email,
            subject: `Meeting Recap: ${meeting.title}`,
            html,
          });

          // Mark as delivered (unique index prevents duplicates)
          await RecapDelivery.findOneAndUpdate(
            { meetingId, userId: user._id },
            {
              $set: {
                status: "delivered",
                channel: "email",
                errorMessage: null,
                deliveredAt: new Date(),
              },
              $setOnInsert: { meetingId, userId: user._id },
            },
            { upsert: true },
          );
        } catch (userErr) {
          console.error(
            `[RecapEmailService] Immediate recap failed for user ${user._id}:`,
            userErr,
          );
          try {
            await RecapDelivery.findOneAndUpdate(
              { meetingId, userId: user._id },
              {
                $set: {
                  status: "failed",
                  channel: "email",
                  errorMessage: String(userErr?.message || userErr).slice(
                    0,
                    500,
                  ),
                  deliveredAt: new Date(),
                },
                $setOnInsert: { meetingId, userId: user._id },
              },
              { upsert: true },
            );
          } catch {
            /* best-effort failure record */
          }
        }
      }
    } catch (err) {
      console.error("[RecapEmailService] Error in sendImmediateRecap:", err);
    }
  }

  /**
   * Batch recaps for a specific user and timing
   */
  static async batchRecapsByUser(userId, timing) {
    try {
      const user = await User.findById(userId);
      if (!user) return { skipped: true, reason: "user_not_found" };

      const preferences = await RecapPreference.findOne({ userId });
      if (!preferences || preferences.deliveryTiming !== timing) {
        return { skipped: true, reason: "preference_mismatch" };
      }

      if (this.isQuietHours(preferences)) {
        return { skipped: true, reason: "quiet_hours" };
      }

      if (await this.isEmailUnsubscribed(userId, timing)) {
        return { skipped: true, reason: "unsubscribed" };
      }

      // Meetings the user owns/participates in — scoped to their organization.
      const meetingFilter = {
        status: "completed",
        deletedAt: null,
        $or: [{ uploadedBy: user._id }, { "participants.email": user.email }],
      };
      if (user.organization) {
        meetingFilter.organization = user.organization;
      }

      const recentMeetings = await Meeting.find(meetingFilter)
        .sort({ date: -1 })
        .limit(20);

      const undeliveredMeetings = [];
      for (const meeting of recentMeetings) {
        const delivered = await RecapDelivery.findOne({
          meetingId: meeting._id,
          userId: user._id,
        });
        if (!delivered) {
          undeliveredMeetings.push(meeting);
        }
      }

      if (undeliveredMeetings.length === 0) {
        return { skipped: true, reason: "nothing_to_deliver" };
      }

      let html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">`;
      html += `<h2 style="color: #2563eb;">Your ${timing === "daily" ? "Daily" : "Weekly"} Meeting Digest</h2>`;
      html += `<p>You have ${undeliveredMeetings.length} new meeting recaps.</p>`;

      for (const meeting of undeliveredMeetings) {
        const recapHtml = await this.buildRecapHtml(meeting, preferences);
        html += `<div style="margin-bottom: 30px;">${recapHtml}</div>`;
      }

      html += `</div>`;

      await EmailService.sendMail({
        from: process.env.SENDER_EMAIL || "no-reply@meetonmemory.com",
        to: user.email,
        subject: `Your ${timing === "daily" ? "Daily" : "Weekly"} Meeting Recap Digest`,
        html,
      });

      // Mark all as delivered after successful send (unique index is the hard guard).
      for (const meeting of undeliveredMeetings) {
        try {
          await RecapDelivery.create({
            meetingId: meeting._id,
            userId: user._id,
          });
        } catch (dupErr) {
          // Duplicate key = already recorded for this window; safe to ignore.
          if (dupErr?.code !== 11000) throw dupErr;
        }
      }

      return {
        skipped: false,
        delivered: undeliveredMeetings.length,
      };
    } catch (err) {
      console.error(
        `[RecapEmailService] Error in batchRecapsByUser for ${userId}:`,
        err,
      );
      throw err;
    }
  }

  /**
   * Process all users with the given RecapPreference timing in bounded pages.
   * Preference-driven — never hardcodes recipients (#1398).
   *
   * @param {"daily"|"weekly"} timing
   * @param {{ batchSize?: number }} [options]
   */
  static async processScheduledBatch(
    timing,
    { batchSize = DEFAULT_BATCH_SIZE } = {},
  ) {
    if (timing !== "daily" && timing !== "weekly") {
      throw new Error(`Unsupported recap batch timing: ${timing}`);
    }

    const pageSize = Math.max(1, Number(batchSize) || DEFAULT_BATCH_SIZE);
    let lastId = null;
    let processed = 0;
    let delivered = 0;
    let skipped = 0;
    let errors = 0;

    while (true) {
      const query = { deliveryTiming: timing };
      if (lastId) {
        query._id = { $gt: lastId };
      }

      const preferencePage = await RecapPreference.find(query)
        .sort({ _id: 1 })
        .limit(pageSize)
        .select("_id userId")
        .lean();

      if (preferencePage.length === 0) break;

      for (const pref of preferencePage) {
        try {
          const result = await this.batchRecapsByUser(pref.userId, timing);
          processed++;
          if (result?.skipped) {
            skipped++;
          } else if (result?.delivered) {
            delivered += result.delivered;
          }
        } catch (err) {
          errors++;
          console.error(
            `[RecapEmailService] Batch item failed for user ${pref.userId}:`,
            err,
          );
        }
      }

      lastId = preferencePage[preferencePage.length - 1]._id;
      if (preferencePage.length < pageSize) break;
    }

    return { processed, delivered, skipped, errors, timing };
  }
}

export default RecapEmailService;
