import GuestAccessService from "../services/guestAccessService.js";
import Meeting from "../models/meetingModel.js";
import Comment from "../models/commentModel.js";
import ActionItem from "../models/actionItemModel.js";
import mongoose from "mongoose";

/**
 * Controller for managing guest access tokens.
 */
class GuestAccessController {
  // --- Authenticated routes for hosts ---

  static async createToken(req, res) {
    try {
      const { meetingId } = req.params;
      const { guestEmail, permissions, expiresAt, maxViews } = req.body;
      const createdBy = req.user._id;

      // Ensure meeting exists and user has access (basic check)
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Check if user is the organizer or in organization (simplified for example)
      if (
        meeting.organization.toString() !== req.user.organization.toString()
      ) {
        return res
          .status(403)
          .json({ error: "Unauthorized to create token for this meeting" });
      }

      const { rawToken, guestToken } = await GuestAccessService.generateToken({
        meetingId,
        guestEmail,
        permissions,
        expiresAt: new Date(expiresAt),
        maxViews,
        createdBy,
        organizationId: req.user.organization,
      });

      res.status(201).json({
        message: "Guest token created successfully",
        token: rawToken, // Return raw token to be copied by the host
        tokenRecord: guestToken,
      });
    } catch (error) {
      console.error("Error creating guest token:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getMeetingTokens(req, res) {
    try {
      const { meetingId } = req.params;

      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const tokens = await GuestAccessService.getMeetingTokens(meetingId);
      res.status(200).json(tokens);
    } catch (error) {
      console.error("Error fetching guest tokens:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async revokeToken(req, res) {
    try {
      const { tokenId } = req.params;
      const revokedBy = req.user._id;

      const revokedToken = await GuestAccessService.revokeToken(
        tokenId,
        revokedBy,
        req.user.organization,
      );

      res.status(200).json({ message: "Token revoked", token: revokedToken });
    } catch (error) {
      console.error("Error revoking guest token:", error);
      res.status(400).json({ error: error.message });
    }
  }

  // --- Unauthenticated routes for guests ---

  static async getGuestMeetingData(req, res) {
    try {
      const { token } = req.params;

      const validToken = await GuestAccessService.validateAndRecordView(token);

      // Fetch meeting based on permissions
      const meetingId = validToken.meetingId._id || validToken.meetingId;
      const meeting = await Meeting.findById(meetingId).select(
        "title date status organization",
      );

      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const responseData = {
        meeting: {
          _id: meeting._id,
          title: meeting.title,
          date: meeting.date,
          status: meeting.status,
        },
        permissions: validToken.permissions,
        guestEmail: validToken.guestEmail,
      };

      // Populate permitted data
      if (validToken.permissions.includes("view_transcript")) {
        const MeetingModel = mongoose.model("Meeting"); // Assuming transcript is on Meeting or related
        const meetingWithTranscript =
          await MeetingModel.findById(meetingId).select("transcript");
        responseData.transcript = meetingWithTranscript.transcript;
      }

      if (validToken.permissions.includes("view_summary")) {
        const meetingWithSummary =
          await Meeting.findById(meetingId).select("aiSummary");
        responseData.aiSummary = meetingWithSummary.aiSummary;
      }

      if (validToken.permissions.includes("view_action_items")) {
        responseData.actionItems = await ActionItem.find({
          meeting: meetingId,
        });
      }

      res.status(200).json(responseData);
    } catch (error) {
      console.error("Error validating guest token:", error);
      res.status(401).json({ error: error.message });
    }
  }

  static async addGuestComment(req, res) {
    try {
      const { token } = req.params;
      const { body } = req.body;

      const validToken = await GuestAccessService.validateAndRecordView(token);

      if (!validToken.permissions.includes("add_comments")) {
        return res
          .status(403)
          .json({ error: "Token does not grant comment permission" });
      }

      const meetingId = validToken.meetingId._id || validToken.meetingId;
      const meeting = await Meeting.findById(meetingId).select("organization");

      const comment = await Comment.create({
        meeting: meetingId,
        organization: meeting.organization,
        body,
        guestEmail: validToken.guestEmail,
      });

      res.status(201).json({ message: "Comment added", comment });
    } catch (error) {
      console.error("Error adding guest comment:", error);
      res.status(400).json({ error: error.message });
    }
  }
}

export default GuestAccessController;
