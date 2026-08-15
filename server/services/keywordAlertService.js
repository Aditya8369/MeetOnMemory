import KeywordAlert from "../models/keywordAlertModel.js";
import { createNotifications } from "./notificationService.js";
import EmailService from "./EmailService.js";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

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

      // 2. Scan the transcript
      for (const keyword of alert.keywords) {
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
      // Create personalized notifications by looping since each might have different matched keywords,
      // or we can just send a generic one using bulk if we simplify. 
      // To be precise with keywords, we create individually. The createNotifications takes an array of users but sends the same payload.
      // So we will just loop and use createNotifications for each.
      const promises = usersToNotifyApp.map((userId) => {
        const { matchedKeywords } = matchedKeywordsMap.get(userId);
        const keywordStr = matchedKeywords.join(", ");
        return createNotifications([userId], {
          title: "Keyword Alert",
          description: `Your watched keyword(s) (${keywordStr}) were mentioned in "${meetingTitle}".`,
          category: "system", // Or add keyword_alerts to CATEGORY_TO_PREFERENCE later
          actionUrl: `/meeting/${meetingId}`,
          actionLabel: "View Meeting",
        });
      });
      await Promise.all(promises);
    }

    // 4. Dispatch email notifications
    if (usersToNotifyEmail.length > 0) {
      const emailPromises = usersToNotifyEmail.map((alert) => {
        const userIdStr = alert.user._id.toString();
        const { matchedKeywords } = matchedKeywordsMap.get(userIdStr);
        const keywordStr = matchedKeywords.join(", ");
        
        return EmailService.sendMail({
          to: alert.user.email,
          subject: `MeetOnMemory: Keyword Alert - ${meetingTitle}`,
          html: `<p>Hi ${alert.user.name},</p>
<p>The following keywords you are watching were mentioned in the meeting <strong>${meetingTitle}</strong>:</p>
<p><strong>${keywordStr}</strong></p>
<p><a href="${process.env.FRONTEND_URL}/meeting/${meetingId}">Click here to view the meeting</a></p>`,
        });
      });
      await Promise.all(emailPromises);
    }
  } catch (error) {
    console.error("⚠️ Failed to scan transcript for keywords:", error);
  }
};
