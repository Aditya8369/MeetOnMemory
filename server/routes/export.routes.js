const express = require("express");
const router = express.Router();
const ExportTemplate = require("../models/ExportTemplate");
const DataExtractor = require("../services/dataExtractor");
const DocumentGenerator = require("../services/documentGenerator");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

/**
 * @route   GET /api/export/templates
 * @desc    Get all available export templates for the user's team
 */
router.get("/templates", async (req, res) => {
  try {
    const templates = await ExportTemplate.find({
      $or: [{ teamId: req.user.teamId }, { isPublic: true }],
    }).sort({ usageCount: -1 });

    res.status(200).json({ success: true, data: templates });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   POST /api/export/templates
 * @desc    Create a new custom export template
 */
router.post("/templates", async (req, res) => {
  try {
    const template = await ExportTemplate.create({
      ...req.body,
      createdBy: req.user.id,
      teamId: req.user.teamId,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/export/meeting/:meetingId
 * @desc    Generate and download a meeting export document
 */
router.post("/meeting/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { templateId, format } = req.body; // format: 'pdf', 'docx', 'html'

    // 1. Fetch template
    const template = await ExportTemplate.findById(templateId);
    if (!template)
      return res
        .status(404)
        .json({ success: false, error: "Template not found" });

    // 2. Extract meeting data
    let data = await DataExtractor.extractMeetingData(meetingId);
    data = DataExtractor.applySectionFilters(data, template.sections);

    // 3. Render content
    const htmlContent = DocumentGenerator.renderHTML(
      template.templateContent,
      data,
    );

    let buffer;
    let contentType;
    let extension;

    // 4. Generate document based on format
    if (format === "pdf") {
      buffer = await DocumentGenerator.generatePDF(
        htmlContent,
        template.branding,
      );
      contentType = "application/pdf";
      extension = "pdf";
    } else if (format === "docx") {
      buffer = await DocumentGenerator.generateDOCX(data, template.branding);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      extension = "docx";
    } else {
      // HTML fallback
      const fullHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${data.meeting.title}</title>
            <style>${template.styles}</style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;
      buffer = Buffer.from(fullHTML);
      contentType = "text/html";
      extension = "html";
    }

    // Increment usage count
    await ExportTemplate.updateOne(
      { _id: templateId },
      { $inc: { usageCount: 1 } },
    );

    // Send file
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meeting-minutes-${meetingId}.${extension}"`,
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate export",
    });
  }
});

/**
 * @route   POST /api/export/templates/:id/preview
 * @desc    Preview a template with sample data (returns HTML)
 */
router.post("/templates/:id/preview", async (req, res) => {
  try {
    const { id: _id } = req.params;
    const { templateContent, meetingData } = req.body;

    const htmlContent = DocumentGenerator.renderHTML(
      templateContent,
      meetingData,
    );
    res.status(200).json({ success: true, data: { html: htmlContent } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
