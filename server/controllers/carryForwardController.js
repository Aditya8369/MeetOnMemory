import carryForwardService from "../services/carryForwardService.js";

export const getConfig = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const organizationId = req.user.organization || null;
    const config = await carryForwardService.getConfig(
      seriesId,
      organizationId,
    );
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error("Error getting carry forward config:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { carryForwardRules } = req.body;
    const config = await carryForwardService.updateConfig(
      seriesId,
      carryForwardRules,
    );
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error("Error updating carry forward config:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getPreview = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const preview = await carryForwardService.getCarryForwardPreview(seriesId);
    res.status(200).json({ success: true, preview });
  } catch (error) {
    console.error("Error generating carry forward preview:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const applyCarryForward = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { currentMeetingId } = req.body;

    if (!currentMeetingId) {
      return res
        .status(400)
        .json({ success: false, message: "currentMeetingId is required" });
    }

    const result = await carryForwardService.applyCarryForward(
      seriesId,
      currentMeetingId,
    );
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error applying carry forward:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
