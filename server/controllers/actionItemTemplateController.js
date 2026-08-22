import * as actionItemTemplateService from "../services/actionItemTemplateService.js";

export const createTemplate = async (req, res) => {
  try {
    const template = await actionItemTemplateService.createTemplate(
      req.body,
      req.user.organization,
      req.user._id,
    );
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
};

export const getTemplates = async (req, res) => {
  try {
    const templates = await actionItemTemplateService.getTemplates(
      req.user.organization,
    );
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const template = await actionItemTemplateService.getTemplateById(
      req.params.id,
      req.user.organization,
    );
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json(template);
  } catch (error) {
    console.error("Error fetching template by ID:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const template = await actionItemTemplateService.updateTemplate(
      req.params.id,
      req.body,
      req.user.organization,
    );
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const template = await actionItemTemplateService.deleteTemplate(
      req.params.id,
      req.user.organization,
    );
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
};

export const applyTemplate = async (req, res) => {
  try {
    const { templateId, meetingId } = req.body;

    if (!templateId || !meetingId) {
      return res
        .status(400)
        .json({ message: "templateId and meetingId are required" });
    }

    const createdCount = await actionItemTemplateService.applyTemplateToMeeting(
      templateId,
      meetingId,
      req.user._id,
    );

    res
      .status(200)
      .json({ message: "Template applied successfully", createdCount });
  } catch (error) {
    console.error("Error applying template:", error);
    res.status(500).json({ message: "Failed to apply template" });
  }
};
