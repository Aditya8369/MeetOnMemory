import StandupReport from "../models/standupReportModel.js";
import StandupPreference from "../models/standupPreferenceModel.js";
import { generateStandupReport } from "../services/standupReportService.js";

// GET /api/standups/my
export const getMyReports = async (req, res) => {
  try {
    const { organizationId } = req.query; // Assuming organization is passed in query or we get it from user context
    const orgId = organizationId || req.user.organization; // fallback depending on how auth is structured

    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const reports = await StandupReport.find({
      user: req.user._id,
      organization: orgId,
    })
      .sort({ date: -1 })
      .limit(20) // Limit to recent
      .populate("completedActionItems.actionItem")
      .populate("upcomingActionItems.actionItem")
      .populate("blockers.actionItem")
      .populate("attendedMeetings.meeting");

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("getMyReports Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/standups/team
export const getTeamReports = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const orgId = organizationId || req.user.organization;

    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    // Optional: Add RBAC check here to ensure req.user is an admin/owner for orgId
    // For now, we allow any member of the org to view team standups.

    const reports = await StandupReport.find({
      organization: orgId,
    })
      .sort({ date: -1 })
      .limit(50)
      .populate("user", "name email displayName avatarUrl")
      .populate("completedActionItems.actionItem")
      .populate("upcomingActionItems.actionItem")
      .populate("blockers.actionItem")
      .populate("attendedMeetings.meeting");

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("getTeamReports Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/standups/generate
export const generateManualReport = async (req, res) => {
  try {
    const { organizationId, type } = req.body;
    const orgId = organizationId || req.user.organization;
    const reportType = type || "daily";

    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const endDate = new Date();
    const startDate = new Date();
    if (reportType === "daily") {
      startDate.setDate(startDate.getDate() - 1);
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }

    const report = await generateStandupReport(
      req.user._id,
      orgId,
      reportType,
      startDate,
      endDate,
    );

    res.json({ success: true, data: report });
  } catch (error) {
    console.error("generateManualReport Error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error generating report",
        error: error.message,
      });
  }
};

// GET /api/standups/preferences
export const getPreferences = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const orgId = organizationId || req.user.organization;

    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    let pref = await StandupPreference.findOne({
      user: req.user._id,
      organization: orgId,
    });

    if (!pref) {
      // Return default values if not found
      pref = {
        scheduleType: "daily",
        timeOfDay: "09:00",
        deliveryChannels: ["in-app"],
      };
    }

    res.json({ success: true, data: pref });
  } catch (error) {
    console.error("getPreferences Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/standups/preferences
export const updatePreferences = async (req, res) => {
  try {
    const { organizationId, scheduleType, timeOfDay, deliveryChannels } =
      req.body;
    const orgId = organizationId || req.user.organization;

    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const pref = await StandupPreference.findOneAndUpdate(
      { user: req.user._id, organization: orgId },
      { scheduleType, timeOfDay, deliveryChannels },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.json({ success: true, data: pref });
  } catch (error) {
    console.error("updatePreferences Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
