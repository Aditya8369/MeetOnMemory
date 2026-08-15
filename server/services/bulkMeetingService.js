import Meeting from "../models/meetingModel.js";
import ExportService from "./ExportService.js";
import archiver from "archiver";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";

const MAX_BULK_LIMIT = 50;

class BulkMeetingService {
  /**
   * Validate meeting IDs and ensure they belong to the user's organization.
   * Also ensures the number of meetings does not exceed MAX_BULK_LIMIT.
   */
  static async validateMeetings(meetingIds, userOrgId) {
    if (!meetingIds || !Array.isArray(meetingIds) || meetingIds.length === 0) {
      throw new ValidationError("No meetings selected.");
    }

    if (meetingIds.length > MAX_BULK_LIMIT) {
      throw new ValidationError(
        `You can only select up to ${MAX_BULK_LIMIT} meetings at once.`,
      );
    }

    const meetings = await Meeting.find({
      _id: { $in: meetingIds },
      organization: userOrgId,
    }).select("_id");

    if (meetings.length !== meetingIds.length) {
      throw new ForbiddenError(
        "One or more selected meetings were not found or you do not have permission to modify them.",
      );
    }

    return true;
  }

  /**
   * Bulk Archive
   */
  static async bulkArchive(meetingIds, userOrgId) {
    await this.validateMeetings(meetingIds, userOrgId);

    const result = await Meeting.updateMany(
      { _id: { $in: meetingIds }, organization: userOrgId },
      { $set: { archived: true } },
    );

    return result.modifiedCount;
  }

  /**
   * Bulk Tag
   */
  static async bulkTag(meetingIds, tags, userOrgId) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      throw new ValidationError("No tags provided.");
    }

    await this.validateMeetings(meetingIds, userOrgId);

    const result = await Meeting.updateMany(
      { _id: { $in: meetingIds }, organization: userOrgId },
      { $addToSet: { tags: { $each: tags } } },
    );

    return result.modifiedCount;
  }

  /**
   * Bulk Soft Delete
   */
  static async bulkSoftDelete(meetingIds, userOrgId, userId) {
    await this.validateMeetings(meetingIds, userOrgId);

    const result = await Meeting.updateMany(
      { _id: { $in: meetingIds }, organization: userOrgId },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
    );

    return result.modifiedCount;
  }

  /**
   * Bulk Restore (Un-archive and un-delete)
   */
  static async bulkRestore(meetingIds, userOrgId) {
    await this.validateMeetings(meetingIds, userOrgId);

    const result = await Meeting.updateMany(
      { _id: { $in: meetingIds }, organization: userOrgId },
      {
        $set: { archived: false, deletedAt: null, deletedBy: null },
      },
    );

    return result.modifiedCount;
  }

  /**
   * Bulk Export to ZIP
   * Writes the ZIP archive to the provided output stream (e.g., HTTP Response).
   */
  static async bulkExport(meetingIds, userOrgId, format, outputStream) {
    await this.validateMeetings(meetingIds, userOrgId);

    const meetings = await Meeting.find({
      _id: { $in: meetingIds },
      organization: userOrgId,
    })
      .populate("uploadedBy", "name email")
      .populate("participants.user", "name email")
      .lean();

    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // Pipe archive data to the output stream
    archive.pipe(outputStream);

    archive.on("error", (err) => {
      console.error("Error creating zip archive:", err);
      throw err;
    });

    for (const meeting of meetings) {
      let filename;
      const safeTitle = (meeting.title || "Meeting")
        .replace(/[^a-zA-Z0-9 -]/g, "")
        .trim();
      const dateStr = meeting.date
        ? new Date(meeting.date).toISOString().split("T")[0]
        : "NoDate";

      const baseFilename = `${dateStr}_${safeTitle}`;

      try {
        if (format === "pdf") {
          const doc = ExportService.generateMeetingPDF(meeting);
          filename = `${baseFilename}.pdf`;
          archive.append(doc, { name: filename });
        } else if (format === "docx") {
          const buffer = await ExportService.generateMeetingDOCX(meeting);
          filename = `${baseFilename}.docx`;
          archive.append(buffer, { name: filename });
        } else if (format === "md") {
          const mdContent = ExportService.generateMeetingMD(meeting);
          filename = `${baseFilename}.md`;
          archive.append(mdContent, { name: filename });
        } else if (format === "json") {
          const jsonData = JSON.stringify(meeting, null, 2);
          filename = `${baseFilename}.json`;
          archive.append(jsonData, { name: filename });
        } else {
          // Default to MD
          const mdContent = ExportService.generateMeetingMD(meeting);
          filename = `${baseFilename}.md`;
          archive.append(mdContent, { name: filename });
        }
      } catch (err) {
        console.error(
          `Failed to process export for meeting ${meeting._id}:`,
          err,
        );
        // We can append a small text file saying it failed
        archive.append(
          `Failed to export meeting: ${meeting._id}\nError: ${err.message}`,
          {
            name: `${baseFilename}_error.txt`,
          },
        );
      }
    }

    await archive.finalize();
  }
}

export default BulkMeetingService;
