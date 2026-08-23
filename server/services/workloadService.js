import ActionItem from "../models/actionItemModel.js";
import Membership from "../models/membershipModel.js";
import GenerativeAIService from "./GenerativeAIService.js";
import { logActivity } from "./activityService.js";

class WorkloadService {
  /**
   * Get the current workload for all members in an organization.
   * Groups open/in-progress action items by assignee.
   */
  static async getWorkload(organizationId) {
    // Get all organization members
    const memberships = await Membership.find({
      organization: organizationId,
      status: "active",
    }).populate("user", "name email avatarUrl");

    // Get all open action items for the organization
    const actionItems = await ActionItem.find({
      organization: organizationId,
      status: { $in: ["open", "in-progress"] },
    })
      .populate("assignee", "name email avatarUrl")
      .populate("sourceMeetingId", "title date")
      .lean();

    const memberMap = new Map();

    // Initialize all members with 0 workload
    memberships.forEach((m) => {
      if (m.user) {
        memberMap.set(m.user._id.toString(), {
          user: m.user,
          actionItems: [],
          loadScore: 0,
        });
      }
    });

    // Assign action items to members
    actionItems.forEach((item) => {
      if (item.assignee) {
        const userId = item.assignee._id.toString();
        if (!memberMap.has(userId)) {
          memberMap.set(userId, {
            user: item.assignee,
            actionItems: [],
            loadScore: 0,
          });
        }

        const memberData = memberMap.get(userId);
        memberData.actionItems.push(item);

        let score = 1;
        if (item.priority === "high") score = 2;
        if (item.priority === "urgent") score = 3;
        memberData.loadScore += score;
      }
    });

    return Array.from(memberMap.values());
  }

  /**
   * Suggest a workload rebalance using AI.
   */
  static async suggestRebalance(organizationId) {
    const workloads = await this.getWorkload(organizationId);

    // Calculate median load
    const loadScores = workloads.map((w) => w.loadScore).sort((a, b) => a - b);
    const medianLoad = loadScores[Math.floor(loadScores.length / 2)] || 0;

    const overloaded = workloads.filter(
      (w) => w.loadScore > medianLoad * 1.5 && w.loadScore > 1,
    );
    const underloaded = workloads.filter(
      (w) => w.loadScore <= medianLoad && w.actionItems.length < 5,
    );

    if (overloaded.length === 0 || underloaded.length === 0) {
      return {
        suggestions: [],
        message: "Workload is relatively balanced or not enough data.",
      };
    }

    // Build prompt for AI
    const prompt = `
You are an AI assistant helping a manager rebalance workload in an organization.
The following members are overloaded:
${overloaded.map((w) => `- ${w.user.name} (ID: ${w.user._id}): Load Score ${w.loadScore}`).join("\n")}

Their tasks:
${overloaded.map((w) => w.actionItems.map((a) => `Task: "${a.text}" | Priority: ${a.priority} | ID: ${a._id} | Assignee ID: ${w.user._id}`).join("\n")).join("\n")}

The following members have capacity:
${underloaded.map((w) => `- ${w.user.name} (ID: ${w.user._id}): Load Score ${w.loadScore}`).join("\n")}

Suggest 1-3 specific action item reassignments to balance the load.
Return the output as a JSON array of objects with the following keys exactly:
"actionItemId": (the string ID of the task)
"fromUserId": (the string ID of the current assignee)
"toUserId": (the string ID of the suggested new assignee)
"reason": (a brief explanation of why this reassignment makes sense)

Respond with ONLY valid JSON array. Do not include markdown formatting or extra text.
`;

    try {
      const responseText = await GenerativeAIService.generateText(
        prompt,
        "system",
      );

      let suggestions = [];
      try {
        const cleanedText = responseText
          .replace(/\\`\\`\\`json/g, "")
          .replace(/\\`\\`\\`/g, "")
          .trim();
        suggestions = JSON.parse(cleanedText);
      } catch (e) {
        console.error(
          "Failed to parse AI rebalance suggestions",
          e,
          responseText,
        );
      }

      // Enrich suggestions with item details and user details
      const enrichedSuggestions = suggestions
        .map((s) => {
          let item = null;
          overloaded.forEach((w) => {
            const found = w.actionItems.find(
              (a) => a._id.toString() === s.actionItemId,
            );
            if (found) item = found;
          });
          const fromUser = workloads.find(
            (w) => w.user._id.toString() === s.fromUserId,
          )?.user;
          const toUser = workloads.find(
            (w) => w.user._id.toString() === s.toUserId,
          )?.user;

          return {
            ...s,
            item,
            fromUser,
            toUser,
          };
        })
        .filter((s) => s.item && s.fromUser && s.toUser); // filter out invalid ones

      return {
        suggestions: enrichedSuggestions,
        message: "Rebalance suggestions generated successfully.",
      };
    } catch (error) {
      console.error("AI rebalance suggestion error:", error);
      throw new Error("Failed to generate workload rebalance suggestions.");
    }
  }

  /**
   * Execute batch reassignments
   */
  static async executeRebalance(organizationId, reassignments, actorId, io) {
    const results = [];
    for (const req of reassignments) {
      const { actionItemId, toUserId } = req;
      try {
        const item = await ActionItem.findOne({
          _id: actionItemId,
          organization: organizationId,
        });
        if (!item) continue;

        const oldAssignee = item.assignee;
        item.assignee = toUserId;
        await item.save();

        await logActivity(
          io,
          organizationId,
          actorId,
          "actionItem.reassigned",
          "ActionItem",
          item._id,
          item.text,
          { from: oldAssignee, to: toUserId },
        );

        results.push({ actionItemId, status: "success" });
      } catch (e) {
        console.error(`Failed to reassign ${actionItemId}:`, e);
        results.push({ actionItemId, status: "error", error: e.message });
      }
    }
    return results;
  }
}

export default WorkloadService;
