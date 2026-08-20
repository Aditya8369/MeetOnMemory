import MeetingPattern from "../models/meetingPatternModel.js";
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

    const pattern = await MeetingPattern.findOneAndUpdate(
      { _id: id, organization: orgId },
      { status: "acknowledged" },
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

    const pattern = await MeetingPattern.findOneAndUpdate(
      { _id: id, organization: orgId },
      { status: "dismissed" },
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
