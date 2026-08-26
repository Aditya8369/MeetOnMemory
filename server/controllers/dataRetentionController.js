import DataRetentionService from "../services/dataRetentionService.js";

export const getPolicy = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const policy = await DataRetentionService.getPolicy(organizationId);
    res.json(policy);
  } catch (error) {
    console.error("Error fetching data retention policy:", error);
    res.status(500).json({ message: "Failed to fetch data retention policy" });
  }
};

export const updatePolicy = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const updateData = req.body;
    const actorId = req.user.id;

    const policy = await DataRetentionService.updatePolicy(
      organizationId,
      updateData,
      actorId,
    );
    res.json(policy);
  } catch (error) {
    console.error("Error updating data retention policy:", error);
    res.status(500).json({ message: "Failed to update data retention policy" });
  }
};

export const getSweepPreview = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const preview = await DataRetentionService.getSweepPreview(organizationId);
    res.json(preview);
  } catch (error) {
    console.error("Error fetching sweep preview:", error);
    res.status(500).json({ message: "Failed to fetch sweep preview" });
  }
};

export const triggerSweep = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const actorId = req.user.id;

    const result = await DataRetentionService.executeSweep(
      organizationId,
      actorId,
    );
    res.json({ message: "Sweep executed successfully", result });
  } catch (error) {
    console.error("Error executing data retention sweep:", error);
    res.status(500).json({ message: "Failed to execute sweep" });
  }
};
