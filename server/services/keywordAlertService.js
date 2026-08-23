import KeywordAlert from "../models/keywordAlertModel.js";
import { createNotifications } from "./notificationService.js";
import EmailService from "./EmailService.js";
import { escapeRegex } from "../utils/regex.js";

export const scanTranscriptForKeywords = async (meeting, transcript) => {
  if (!transcript || !meeting || !meeting.organization) return;

  const orgId = meeting.organization;
  const meetingId = meeting._id;
  const meetingTitle = meeting.title || "Untitled Meeting";

  try {
    // 1. Fetch all active keyword alerts for this organization
    const activeAlerts = await KeywordAlert.find({
      organization: orgId,
      isActive: true,
      keywords: { $not: { $size: 0 } },
    }).populate("user", "name email");

    if (!activeAlerts || activeAlerts.length === 0) return;

    // We'll prepare maps for notifications
    const usersToNotifyApp = [];
    const usersToNotifyEmail = [];

    // Group matched keywords per user
    const matchedKeywordsMap = new Map();

    for (const alert of activeAlerts) {
      if (!alert.user) continue;

      const userIdStr = alert.user._id.toString();
      const matched = [];

      // Bounded keyword scanning to defend against oversized records
      const sanitizedKeywords = [
        ...new Set(
          (alert.keywords || [])
            .map((k) => k?.trim())
            .filter((k) => k && k.length > 0)
            .map((k) => (k.length > 50 ? k.slice(0, 50) : k)),
        ),
      ].slice(0, 50);

      // 2. Scan the transcript
      for (const keyword of sanitizedKeywords) {
        // Case-insensitive boundary match (might be simpler depending on requirements)
        // using a basic regex with boundaries.
        const escaped = escapeRegex(keyword);
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        if (regex.test(transcript)) {
          matched.push(keyword);
        }
      }

      if (matched.length > 0) {
        matchedKeywordsMap.set(userIdStr, {
          user: alert.user,
          matchedKeywords: matched,
        });

        if (alert.notifyViaApp) {
          usersToNotifyApp.push(userIdStr);
        }
        if (alert.notifyViaEmail) {
          usersToNotifyEmail.push(alert);
        }
      }
    }

    // 3. Dispatch in-app notifications
    if (usersToNotifyApp.length > 0) {
      const promises = usersToNotifyApp.map(async (userId) => {
        const { matchedKeywords } = matchedKeywordsMap.get(userId);
        const keywordStr = matchedKeywords.join(", ");
        await createNotifications([userId], {
          title: "Keyword Alert",
          description: `Your watched keyword(s) (${keywordStr}) were mentioned in "${meetingTitle}".`,
          category: "system",
          actionUrl: `/meeting/${meetingId}`,
          actionLabel: "View Meeting",
        });

        // Record history log (bounded to last 50 entries)
        await KeywordAlert.findOneAndUpdate(
          { user: userId, organization: orgId },
          {
            $push: {
              deliveryHistory: {
                $each: [
                  {
                    channel: "app",
                    matchedKeywords,
                    meetingId,
                    meetingTitle,
                    status: "delivered",
                    summary: `In-app notification sent for keywords: ${keywordStr}`,
                    sentAt: new Date(),
                  },
                ],
                $slice: -50,
              },
            },
          },
        );
      });
      await Promise.all(promises);
    }

    // 4. Dispatch email notifications
    if (usersToNotifyEmail.length > 0) {
      const emailPromises = usersToNotifyEmail.map(async (alert) => {
        const userIdStr = alert.user._id.toString();
        const { matchedKeywords } = matchedKeywordsMap.get(userIdStr);
        const keywordStr = matchedKeywords.join(", ");

        let status = "delivered";
        try {
          await EmailService.sendMail({
            to: alert.user.email,
            subject: `MeetOnMemory: Keyword Alert - ${meetingTitle}`,
            html: `<p>Hi ${alert.user.name},</p>
<p>The following keywords you are watching were mentioned in the meeting <strong>${meetingTitle}</strong>:</p>
<p><strong>${keywordStr}</strong></p>
<p><a href="${process.env.FRONTEND_URL}/meeting/${meetingId}">Click here to view the meeting</a></p>`,
          });
        } catch (mailErr) {
          console.error("Failed to send keyword alert email:", mailErr);
          status = "failed";
        }

        // Record history log (bounded to last 50 entries)
        await KeywordAlert.findOneAndUpdate(
          { user: userIdStr, organization: orgId },
          {
            $push: {
              deliveryHistory: {
                $each: [
                  {
                    channel: "email",
                    matchedKeywords,
                    meetingId,
                    meetingTitle,
                    recipientEmail: alert.user.email,
                    status,
                    summary: `Email alert (${status}) to ${alert.user.email} for keywords: ${keywordStr}`,
                    sentAt: new Date(),
                  },
                ],
                $slice: -50,
              },
            },
          },
        );
      });
      await Promise.all(emailPromises);
    }
  } catch (error) {
    console.error("⚠️ Failed to scan transcript for keywords:", error);
  }
};
