import MeetingPattern from "../models/meetingPatternModel.js";
import ActionItem from "../models/actionItemModel.js";
import AutomationRule from "../models/automationRuleModel.js";
import meetingPatternService from "../services/meetingPatternService.js";

export const getPatterns = async (req, res) => {
  try {
    const orgId = req.user.organization;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "User must belong to an organization" });
    }

    const patterns = await MeetingPattern.find({
      organization: orgId,
    })
      .populate("affectedMeetings", "title date status")
      .sort({ severity: -1, createdAt: -1 });

    res.status(200).json(patterns);
  } catch (error) {
    console.error("Error fetching meeting patterns:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const acknowledgePattern = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization;
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || req.user.email || "Admin";

    const pattern = await MeetingPattern.findOneAndUpdate(
      { _id: id, organization: orgId },
      {
        $set: { status: "acknowledged" },
        $push: {
          actionHistory: {
            actionType: "acknowledged",
            performedBy: userId,
            performedByName: userName,
            details: { message: "Pattern reviewed and acknowledged." },
            performedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!pattern) {
      return res.status(404).json({ error: "Pattern not found" });
    }

    res.status(200).json(pattern);
  } catch (error) {
    console.error("Error acknowledging meeting pattern:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const dismissPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization;
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || req.user.email || "Admin";

    const pattern = await MeetingPattern.findOneAndUpdate(
      { _id: id, organization: orgId },
      {
        $set: { status: "dismissed" },
        $push: {
          actionHistory: {
            actionType: "dismissed",
            performedBy: userId,
            performedByName: userName,
            details: { message: "Pattern dismissed." },
            performedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!pattern) {
      return res.status(404).json({ error: "Pattern not found" });
    }

    res.status(200).json(pattern);
  } catch (error) {
    console.error("Error dismissing meeting pattern:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Convert an acknowledged/active pattern recommendation into an actionable ActionItem Task
// @route   POST /api/patterns/:id/create-task
// @access  Private
export const createTaskFromPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization;
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || req.user.email || "Admin";
    const { taskText, priority = "high", dueDate } = req.body;

    const pattern = await MeetingPattern.findOne({
      _id: id,
      organization: orgId,
    });

    if (!pattern) {
      return res.status(404).json({ error: "Meeting pattern not found" });
    }

    // Source meeting id
    const sourceMeetingId = pattern.affectedMeetings?.[0] || pattern._id;

    const textToCreate =
      taskText ||
      `[Pattern Action] ${pattern.aiRecommendation || "Resolve " + pattern.type}`;

    const parsedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const actionItem = await ActionItem.create({
      text: textToCreate,
      description: `Action item generated from pattern (${pattern.type}). Recommendation: ${pattern.aiRecommendation}`,
      owner: userName,
      assignee: userId,
      assignedBy: userId,
      status: "open",
      priority,
      organization: orgId,
      sourceMeetingId,
      dueDate: parsedDueDate,
      sourceContext: `MeetingPattern: ${pattern.type}`,
    });

    // Record action in pattern history and set acknowledged
    pattern.status = "acknowledged";
    pattern.actionHistory.push({
      actionType: "task_created",
      performedBy: userId,
      performedByName: userName,
      details: {
        taskId: actionItem._id,
        taskText: actionItem.text,
        dueDate: actionItem.dueDate,
        priority: actionItem.priority,
      },
      performedAt: new Date(),
    });
    await pattern.save();

    res.status(201).json({
      success: true,
      message: "Actionable task generated from pattern successfully",
      actionItem,
      pattern,
    });
  } catch (error) {
    console.error("Error creating task from meeting pattern:", error);
    res.status(500).json({ error: "Failed to create task from pattern" });
  }
};

// @desc    Configure an automation rule directly from pattern remediation
// @route   POST /api/patterns/:id/configure-automation
// @access  Private
export const configureAutomationFromPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization;
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || req.user.email || "Admin";
    const { ruleName, triggerEvent, actionType, actionConfig } = req.body;

    const pattern = await MeetingPattern.findOne({
      _id: id,
      organization: orgId,
    });

    if (!pattern) {
      return res.status(404).json({ error: "Meeting pattern not found" });
    }

    const defaultName =
      ruleName || `Auto-remediation for ${pattern.type.replace(/_/g, " ")}`;
    const event = triggerEvent || "mom.generated";
    const actType = actionType || "email";

    const rule = await AutomationRule.create({
      organization: orgId,
      createdBy: userId,
      name: defaultName,
      description: `Automated rule provisioned from Meeting Pattern (${pattern.type}): ${pattern.aiRecommendation}`,
      enabled: true,
      trigger: {
        event,
        filters: { patternType: pattern.type },
      },
      actions: [
        {
          type: actType,
          config: actionConfig || {
            subject: `Pattern Alert: ${pattern.type}`,
            message: pattern.aiRecommendation,
          },
        },
      ],
    });

    pattern.status = "acknowledged";
    pattern.actionHistory.push({
      actionType: "rule_configured",
      performedBy: userId,
      performedByName: userName,
      details: {
        ruleId: rule._id,
        ruleName: rule.name,
        triggerEvent: event,
        actionType: actType,
      },
      performedAt: new Date(),
    });
    await pattern.save();

    res.status(201).json({
      success: true,
      message: "Automation rule configured successfully from pattern",
      rule,
      pattern,
    });
  } catch (error) {
    console.error("Error creating automation rule from pattern:", error);
    res
      .status(500)
      .json({ error: "Failed to configure automation rule from pattern" });
  }
};

export const triggerManualScan = async (req, res) => {
  try {
    const orgId = req.user.organization;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "User must belong to an organization" });
    }

    // Run all detectors for this specific org
    await meetingPatternService.detectOvertimeTrend(orgId);
    await meetingPatternService.detectDecliningAttendance(orgId);
    await meetingPatternService.detectAgendaBloat(orgId);
    await meetingPatternService.detectStaleActionItems(orgId);

    res.status(200).json({ message: "Manual scan completed successfully." });
  } catch (error) {
    console.error("Error during manual pattern scan:", error);
    res.status(500).json({ error: "Internal server error during manual scan" });
  }
};
