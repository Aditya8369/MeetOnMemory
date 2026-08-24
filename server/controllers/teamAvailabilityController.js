import teamAvailabilityService from "../services/teamAvailabilityService.js";

export const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.organization._id;

    const prefs = await teamAvailabilityService.getPreferences(userId, orgId);
    res.status(200).json(prefs);
  } catch (error) {
    console.error("Error getting preferences:", error);
    res.status(500).json({ error: "Failed to get preferences" });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.organization._id;
    const preferences = req.body;

    const updated = await teamAvailabilityService.updatePreferences(
      userId,
      orgId,
      preferences,
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
};

export const getHeatmapData = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "startDate and endDate are required" });
    }

    const heatmap = await teamAvailabilityService.buildTeamHeatmap(
      orgId,
      startDate,
      endDate,
    );
    res.status(200).json(heatmap);
  } catch (error) {
    console.error("Error generating heatmap:", error);
    res.status(500).json({ error: "Failed to generate heatmap data" });
  }
};

export const findFreeSlots = async (req, res) => {
  try {
    // Expect userIds to be a comma-separated string or array
    const { userIds, durationMinutes, startDate, endDate } = req.body;

    if (!userIds || !durationMinutes || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const uIds = Array.isArray(userIds) ? userIds : userIds.split(",");

    const slots = await teamAvailabilityService.findCommonFreeSlots(
      uIds,
      parseInt(durationMinutes),
      { startDate, endDate },
    );

    res.status(200).json(slots);
  } catch (error) {
    console.error("Error finding free slots:", error);
    res.status(500).json({ error: "Failed to find free slots" });
  }
};

export const getLoadDistribution = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "startDate and endDate are required" });
    }

    const distribution =
      await teamAvailabilityService.calculateLoadDistribution(orgId, {
        startDate,
        endDate,
      });
    res.status(200).json(distribution);
  } catch (error) {
    console.error("Error getting load distribution:", error);
    res.status(500).json({ error: "Failed to calculate load distribution" });
  }
};
