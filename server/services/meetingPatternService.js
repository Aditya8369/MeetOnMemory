import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import MeetingPattern from "../models/meetingPatternModel.js";
import Organization from "../models/organizationModel.js";
import { generateText } from "./GenerativeAIService.js";

class MeetingPatternService {
  async runDetectionJob() {
    const orgs = await Organization.find();

    for (const org of orgs) {
      await this.detectOvertimeTrend(org._id);
      await this.detectDecliningAttendance(org._id);
      await this.detectAgendaBloat(org._id);
      await this.detectStaleActionItems(org._id);
    }
  }

  async detectOvertimeTrend(orgId) {
    const meetings = await Meeting.find({
      organization: orgId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(10); // Check recent meetings

    const overtimeMeetings = meetings.filter((m) => {
      if (!m.duration) return false;
      const totalActualDurationMs = m.agendaItems?.reduce(
        (acc, item) => acc + (item.actualDuration || 0),
        0,
      );
      const totalActualDurationMinutes = totalActualDurationMs / 60000;
      return totalActualDurationMinutes > m.duration * 1.1; // 10% overtime threshold
    });

    if (overtimeMeetings.length >= 3) {
      // 3 or more recent meetings overtime
      const meetingIds = overtimeMeetings.map((m) => m._id);

      const existingPattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "overtime_trend",
        status: { $in: ["active", "acknowledged"] },
      });

      if (!existingPattern) {
        const avgOvertime = Math.round(
          overtimeMeetings.reduce((acc, m) => {
            const actual =
              m.agendaItems?.reduce(
                (sum, item) => sum + (item.actualDuration || 0),
                0,
              ) / 60000;
            return acc + (actual - m.duration);
          }, 0) / overtimeMeetings.length,
        );

        const aiRecommendation = await this._generateAIRecommendation(
          "anti_pattern",
          `Meetings are consistently running over their planned duration by an average of ${avgOvertime} minutes.`,
        );

        await MeetingPattern.create({
          organization: orgId,
          type: "overtime_trend",
          category: "anti_pattern",
          severity: "warning",
          affectedMeetings: meetingIds,
          metadata: {
            avgOvertimeMinutes: avgOvertime,
            count: overtimeMeetings.length,
          },
          aiRecommendation,
        });
      }
    }
  }

  async detectDecliningAttendance(orgId) {
    // Group meetings by series
    const recentMeetings = await Meeting.find({
      organization: orgId,
      series: { $ne: null },
      status: "completed",
    }).sort({ seriesOccurrence: -1 });

    const seriesMap = {};
    for (const m of recentMeetings) {
      if (!seriesMap[m.series]) seriesMap[m.series] = [];
      if (seriesMap[m.series].length < 5) {
        seriesMap[m.series].push(m);
      }
    }

    for (const [seriesId, seriesMeetings] of Object.entries(seriesMap)) {
      if (seriesMeetings.length < 3) continue;

      // Meetings are sorted descending by occurrence. Reverse to get chronological.
      const chronological = seriesMeetings.reverse();
      const attendances = chronological.map((m) => m.participants?.length || 0);

      let isDeclining = true;
      for (let i = 1; i < attendances.length; i++) {
        if (attendances[i] >= attendances[i - 1]) {
          isDeclining = false;
          break;
        }
      }

      if (isDeclining) {
        const existingPattern = await MeetingPattern.findOne({
          organization: orgId,
          type: "declining_attendance",
          status: { $in: ["active", "acknowledged"] },
          "metadata.seriesId": seriesId,
        });

        if (!existingPattern) {
          const aiRecommendation = await this._generateAIRecommendation(
            "anti_pattern",
            `Attendance in a recurring meeting series has been steadily declining over the last ${attendances.length} sessions (from ${attendances[0]} to ${attendances[attendances.length - 1]} participants).`,
          );

          await MeetingPattern.create({
            organization: orgId,
            type: "declining_attendance",
            category: "anti_pattern",
            severity: "warning",
            affectedMeetings: chronological.map((m) => m._id),
            metadata: { seriesId, attendances },
            aiRecommendation,
          });
        }
      }
    }
  }

  async detectAgendaBloat(orgId) {
    const recentMeetings = await Meeting.find({
      organization: orgId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const bloatedMeetings = recentMeetings.filter((m) => {
      const items = m.agendaItems || [];
      if (items.length < 5) return false;

      const incompleteItems = items.filter((i) => i.status !== "completed");
      return incompleteItems.length / items.length > 0.4; // >40% of agenda not completed
    });

    if (bloatedMeetings.length >= 3) {
      const existingPattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "agenda_bloat",
        status: { $in: ["active", "acknowledged"] },
      });

      if (!existingPattern) {
        const aiRecommendation = await this._generateAIRecommendation(
          "anti_pattern",
          "Multiple recent meetings have had large agendas where over 40% of items are left incomplete.",
        );

        await MeetingPattern.create({
          organization: orgId,
          type: "agenda_bloat",
          category: "anti_pattern",
          severity: "warning",
          affectedMeetings: bloatedMeetings.map((m) => m._id),
          metadata: { count: bloatedMeetings.length },
          aiRecommendation,
        });
      }
    }
  }

  async detectStaleActionItems(orgId) {
    // Find action items older than 30 days that are still open/in-progress
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const staleItems = await ActionItem.find({
      organization: orgId,
      status: { $in: ["open", "in-progress"] },
      createdAt: { $lt: thirtyDaysAgo },
    });

    if (staleItems.length >= 5) {
      const existingPattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "stale_action_items",
        status: { $in: ["active", "acknowledged"] },
      });

      if (!existingPattern) {
        const aiRecommendation = await this._generateAIRecommendation(
          "anti_pattern",
          `There are ${staleItems.length} action items that have been open for more than 30 days without resolution.`,
        );

        // Map to meetings where they were created
        const meetingIds = [
          ...new Set(
            staleItems
              .map((item) => item.sourceMeetingId?.toString())
              .filter(Boolean),
          ),
        ];

        await MeetingPattern.create({
          organization: orgId,
          type: "stale_action_items",
          category: "anti_pattern",
          severity: "warning",
          affectedMeetings: meetingIds,
          metadata: { staleCount: staleItems.length },
          aiRecommendation,
        });
      }
    }
  }

  async _generateAIRecommendation(category, description) {
    const prompt = `
You are an expert organizational psychologist and agile coach. 
Given the following organizational pattern detected across recent meetings:
"${description}"

Provide a single, actionable paragraph of advice (max 3 sentences) on how the team can address or improve upon this pattern.
Be direct and professional. Do not use Markdown formatting or bullet points.
`;

    try {
      const response = await generateText(
        prompt,
        "Gemini meeting pattern recommendation",
      );
      return response.trim();
    } catch (error) {
      console.error("AI recommendation generation failed:", error);
      return "Consider reviewing your meeting practices to address this pattern.";
    }
  }
}

export default new MeetingPatternService();
