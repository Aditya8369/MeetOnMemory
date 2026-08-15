import express from "express";
import ExportTemplate from "../models/ExportTemplate.js";
import DataExtractor from "../services/dataExtractor.js";
import DocumentGenerator from "../services/documentGenerator.js";
import { protect } from "../middleware/authMiddleware.js";
import Meeting from "../models/Meeting.js";

const router = express.Router();
router.use(protect);

const VALID_FORMATS = ["pdf", "docx", "html"];

// Helper to verify template access
const verifyTemplateAccess = async (template, user) => {
  if (template.organizationId.toString() !== user.organizationId.toString())
    return false;
  if (template.isPublic) return true;
  if (template.teamId && template.teamId.toString() === user.teamId?.toString())
    return true;
  if (template.createdBy.toString() === user.id) return true;
  return false;
};

router.get("/templates", async (req, res) => {
  try {
    const templates = await ExportTemplate.find({
      organizationId: req.user.organizationId,
      $or: [
        { teamId: req.user.teamId },
        { isPublic: true },
        { createdBy: req.user.id },
      ],
    }).sort({ usageCount: -1 });
    res.status(200).json({ success: true, data: templates });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const template = await ExportTemplate.create({
      ...req.body,
      createdBy: req.user.id,
      organizationId: req.user.organizationId,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/meeting/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { templateId, format, sectionOverrides } = req.body;

    if (!VALID_FORMATS.includes(format)) {
      return res.status(400).json({
        success: false,
        error: "Invalid export format. Must be pdf, docx, or html.",
      });
    }

    // 1. AuthZ Meeting
    const meeting = await Meeting.findById(meetingId);
    if (
      !meeting ||
      meeting.organizationId?.toString() !== req.user.organizationId?.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized access to meeting" });
    }

    // 2. AuthZ Template
    const template = await ExportTemplate.findById(templateId);
    if (!template || !(await verifyTemplateAccess(template, req.user))) {
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized access to template" });
    }

    // 3. Extract & Filter
    let data = await DataExtractor.extractMeetingData(meetingId);
    const activeSections = { ...template.sections, ...sectionOverrides };
    data = DataExtractor.applySectionFilters(data, activeSections);

    // 4. Render
    const htmlContent = DocumentGenerator.renderHTML(
      template.templateContent,
      data,
    );
    const fullHTML = `<!DOCTYPE html><html><head><style>${template.styles}</style></head><body>${htmlContent}</body></html>`;

    let buffer, contentType, extension;

    if (format === "pdf") {
      buffer = await DocumentGenerator.generatePDF(fullHTML, template.branding);
      contentType = "application/pdf";
      extension = "pdf";
    } else if (format === "docx") {
      buffer = await DocumentGenerator.generateDOCX(
        fullHTML,
        template.branding,
      );
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      extension = "docx";
    } else {
      buffer = Buffer.from(fullHTML);
      contentType = "text/html";
      extension = "html";
    }

    await ExportTemplate.updateOne(
      { _id: templateId },
      { $inc: { usageCount: 1 } },
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meeting-minutes-${meetingId}.${extension}"`,
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate export",
    });
  }
});

router.post("/templates/preview", async (req, res) => {
  try {
    const { templateContent, meetingData } = req.body;
    const rawHtml = DocumentGenerator.renderHTML(templateContent, meetingData);
    // Sanitize HTML to prevent XSS in preview
    const safeHtml = DocumentGenerator.sanitizeHTML(rawHtml);
    res.status(200).json({ success: true, data: { html: safeHtml } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
