import eventBus from "./eventBus.js";
import GamificationScore from "../models/gamificationScoreModel.js";
import Badge from "../models/badgeModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";

// Exported for testing/mocking
export const gamificationEngine = {
  awardPoints: async (
    userId,
    organizationId,
    eventName,
    points,
    metadata = {},
  ) => {
    try {
      if (!userId || !organizationId) return null;

      const scoreDoc = await GamificationScore.findOneAndUpdate(
        { user: userId, organization: organizationId },
        {
          $inc: { totalPoints: points },
          $push: {
            history: {
              event: eventName,
              pointsAwarded: points,
              metadata,
            },
          },
        },
        { new: true, upsert: true },
      );

      // Check for badge unlocks
      const newBadges = await gamificationEngine.checkForBadges(scoreDoc);

      return { score: scoreDoc, newBadges };
    } catch (error) {
      console.error("[Gamification Engine] Error awarding points:", error);
      return null;
    }
  },

  checkForBadges: async (scoreDoc) => {
    const newBadgesUnlocked = [];
    try {
      const allBadges = await Badge.find({});
      const unlockedBadgeIds = scoreDoc.unlockedBadges.map((b) =>
        b.badge.toString(),
      );

      for (const badge of allBadges) {
        if (!unlockedBadgeIds.includes(badge._id.toString())) {
          let shouldUnlock = false;

          // Simple criteria based on total points for now
          // e.g., criteria: { type: "points", threshold: 100 }
          if (badge.criteria && badge.criteria.type === "points") {
            if (scoreDoc.totalPoints >= badge.criteria.threshold) {
              shouldUnlock = true;
            }
          }

          if (shouldUnlock) {
            scoreDoc.unlockedBadges.push({ badge: badge._id });
            newBadgesUnlocked.push(badge);
          }
        }
      }

      if (newBadgesUnlocked.length > 0) {
        await scoreDoc.save();
        // Emit event for socket notification
        eventBus.emit("gamification.badgesUnlocked", {
          userId: scoreDoc.user,
          organizationId: scoreDoc.organization,
          badges: newBadgesUnlocked,
        });
      }

      return newBadgesUnlocked;
    } catch (error) {
      console.error("[Gamification Engine] Error checking for badges:", error);
      return newBadgesUnlocked;
    }
  },

  handleMeetingEnded: async (meeting) => {
    // If meeting finished on time relative to planned agenda duration
    let totalActualMs = 0;
    let totalPlannedMins = meeting.duration || 0;

    if (meeting.agendaItems && meeting.agendaItems.length > 0) {
      for (const item of meeting.agendaItems) {
        totalActualMs += item.actualDuration || 0;
        if (!meeting.duration && item.duration) {
          totalPlannedMins += item.duration;
        }
      }
    }

    if (totalPlannedMins > 0 && totalActualMs > 0) {
      const actualMins = totalActualMs / 60000;
      if (actualMins <= totalPlannedMins) {
        await gamificationEngine.awardPoints(
          meeting.uploadedBy, // Host
          meeting.organization,
          "MEETING_ENDED_ON_TIME",
          50,
          { meetingId: meeting._id },
        );
      }
    }
  },

  handleActionItemCompleted: async (actionItem) => {
    if (actionItem.completedAt && actionItem.dueDate) {
      if (new Date(actionItem.completedAt) <= new Date(actionItem.dueDate)) {
        await gamificationEngine.awardPoints(
          actionItem.owner,
          actionItem.organization,
          "ACTION_ITEM_COMPLETED_ON_TIME",
          20,
          { actionItemId: actionItem._id },
        );
      }
    }
  },

  init: () => {
    eventBus.on("meeting.ended", async (data) => {
      try {
        const meeting = await Meeting.findById(data.meetingId);
        if (meeting) {
          await gamificationEngine.handleMeetingEnded(meeting);
        }
      } catch (error) {
        console.error("Error in gamification meeting.ended handler:", error);
      }
    });

    eventBus.on("actionItem.completed", async (data) => {
      try {
        const actionItem = await ActionItem.findById(data.actionItemId);
        if (actionItem) {
          await gamificationEngine.handleActionItemCompleted(actionItem);
        }
      } catch (error) {
        console.error(
          "Error in gamification actionItem.completed handler:",
          error,
        );
      }
    });
  },
};

export default gamificationEngine;
