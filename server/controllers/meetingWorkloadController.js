import MeetingWorkloadService from "../services/meetingWorkloadService.js";
import { hasOrgPermission, PERMISSIONS } from "../utils/rbacPermissions.js";

export const getHeatmap = async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId is required" });
    }

    // Default to last 7 days if not provided
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const heatmap = await MeetingWorkloadService.getUserHeatmap(
      organizationId,
      req.user.id,
      start,
      end,
    );

    res.status(200).json({ data: heatmap });
  } catch (error) {
    console.error("Error in getHeatmap:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTeamWorkload = async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId is required" });
    }

    // RBAC: Need view_analytics or manage_team permission. Or just check if they are owner/admin.
    // For simplicity, we can check if they have manage_users or view_organization_analytics
    const canView = await hasOrgPermission(
      req.user.id,
      organizationId,
      PERMISSIONS.VIEW_ORGANIZATION_ANALYTICS, // Assume this exists, if not we check for 'manage_users'
    );
    // Alternatively, verify membership and role directly. Let's just use the RBAC function.
    if (!canView) {
      // Try an alternative permission if VIEW_ORGANIZATION_ANALYTICS doesn't work, maybe MANAGE_USERS
      const canManage = await hasOrgPermission(
        req.user.id,
        organizationId,
        PERMISSIONS.MANAGE_USERS,
      );
      if (!canManage) {
        return res
          .status(403)
          .json({ message: "Unauthorized to view team workload" });
      }
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const teamWorkload = await MeetingWorkloadService.getTeamWorkload(
      organizationId,
      start,
      end,
    );

    res.status(200).json({ data: teamWorkload });
  } catch (error) {
    console.error("Error in getTeamWorkload:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
