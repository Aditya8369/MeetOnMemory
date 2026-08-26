/**
 * Meeting Feedback authorization (Issue #1538).
 *
 * Every feedback operation resolves the associated meeting before trusting a
 * feedback record or client-supplied meeting id. Feedback is limited to the
 * meeting uploader or listed participants — org membership alone is not enough.
 */

import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import MeetingFeedback from "../models/meetingFeedbackModel.js";

/**
 * @param {{ uploadedBy?: unknown, participants?: Array<{ user?: unknown, email?: string }> }} meeting
 * @param {{ _id?: unknown, email?: string }} user
 */
export const isMeetingFeedbackParticipant = (meeting, user) => {
  if (!meeting || !user?._id) return false;

  const userId = user._id.toString();
  if (meeting.uploadedBy?.toString() === userId) return true;

  const email = user.email?.toLowerCase?.() || "";
  return (meeting.participants || []).some((participant) => {
    if (participant.user?.toString() === userId) return true;
    if (
      email &&
      participant.email &&
      participant.email.toLowerCase() === email
    ) {
      return true;
    }
    return false;
  });
};

/**
 * @param {{ organization?: unknown }} meeting
 * @param {{ organization?: unknown }} user
 * @returns {{ status: number, message: string } | null}
 */
export const getMeetingOrganizationViolation = (meeting, user) => {
  if (
    meeting.organization &&
    (!user.organization ||
      meeting.organization.toString() !== user.organization.toString())
  ) {
    return {
      status: 403,
      message: "Forbidden: Meeting belongs to another organization",
    };
  }
  return null;
};

/**
 * Resolve a meeting and verify the caller may access its feedback.
 *
 * @param {string} meetingId
 * @param {object} user
 * @returns {Promise<{ meeting: object } | { error: { status: number, message: string } }>}
 */
export const resolveMeetingFeedbackAccess = async (meetingId, user) => {
  if (!mongoose.isValidObjectId(meetingId)) {
    return {
      error: {
        status: 400,
        message: "Invalid meeting ID",
      },
    };
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return {
      error: {
        status: 404,
        message: "Meeting not found",
      },
    };
  }

  const orgViolation = getMeetingOrganizationViolation(meeting, user);
  if (orgViolation) {
    return { error: orgViolation };
  }

  if (!isMeetingFeedbackParticipant(meeting, user)) {
    return {
      error: {
        status: 403,
        message: "Not authorized to access feedback for this meeting",
      },
    };
  }

  return { meeting };
};

/**
 * Resolve feedback by id, then re-check meeting participant access before mutation.
 *
 * @param {string} feedbackId
 * @param {object} user
 * @returns {Promise<{ feedback: object, meeting: object } | { error: { status: number, message: string } }>}
 */
export const resolveOwnedFeedbackForMutation = async (feedbackId, user) => {
  if (!mongoose.isValidObjectId(feedbackId)) {
    return {
      error: {
        status: 400,
        message: "Invalid feedback ID",
      },
    };
  }

  const feedback = await MeetingFeedback.findById(feedbackId);
  if (!feedback) {
    return {
      error: {
        status: 404,
        message: "Feedback not found",
      },
    };
  }

  const access = await resolveMeetingFeedbackAccess(
    feedback.meetingId.toString(),
    user,
  );
  if (access.error) {
    return { error: access.error };
  }

  if (feedback.userId.toString() !== user._id.toString()) {
    return {
      error: {
        status: 403,
        message: "Not authorized to modify this feedback",
      },
    };
  }

  return { feedback, meeting: access.meeting };
};

export default {
  isMeetingFeedbackParticipant,
  getMeetingOrganizationViolation,
  resolveMeetingFeedbackAccess,
  resolveOwnedFeedbackForMutation,
};
