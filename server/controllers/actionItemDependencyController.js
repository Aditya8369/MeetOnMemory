import actionItemDependencyService from "../services/actionItemDependencyService.js";

export const addDependency = async (req, res) => {
  try {
    const { dependentId, blockerId } = req.body;
    const orgId = req.user.organization;

    if (!dependentId || !blockerId) {
      return res.status(400).json({
        success: false,
        message: "Both dependentId and blockerId are required",
      });
    }

    const dependency = await actionItemDependencyService.addDependency(
      dependentId,
      blockerId,
      orgId,
    );

    res.status(201).json({
      success: true,
      dependency,
      message: "Dependency added successfully",
    });
  } catch (error) {
    console.error("Error adding dependency:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add dependency",
    });
  }
};

export const removeDependency = async (req, res) => {
  try {
    const { dependentId, blockerId } = req.params;
    const orgId = req.user.organization;

    await actionItemDependencyService.removeDependency(
      dependentId,
      blockerId,
      orgId,
    );

    res.status(200).json({
      success: true,
      message: "Dependency removed successfully",
    });
  } catch (error) {
    console.error("Error removing dependency:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to remove dependency",
    });
  }
};

export const getDependencies = async (req, res) => {
  try {
    const { itemId } = req.params;
    const orgId = req.user.organization;

    const dependencies = await actionItemDependencyService.getDependencies(
      itemId,
      orgId,
    );

    res.status(200).json({
      success: true,
      data: dependencies,
    });
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dependencies",
    });
  }
};
