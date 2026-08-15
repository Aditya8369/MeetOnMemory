import Meeting from "../models/meetingModel.js";
import DismissedDuplicate from "../models/dismissedDuplicateModel.js";
import { computeTextSimilarity } from "../utils/textSimilarity.js";
import mongoose from "mongoose";

// Models that reference meetings to re-parent during a merge
import Comment from "../models/commentModel.js";
import Attachment from "../models/attachmentModel.js";
import FollowUpTask from "../models/FollowUpTask.js";
import Decision from "../models/decisionModel.js";
import KeyMoment from "../models/keyMomentModel.js";

/**
 * Find potential duplicate meetings based on title similarity, date, and organization.
 * @param {String} meetingId - The target meeting ID
 * @returns {Array} List of potential duplicates with similarity scores
 */
export const findDuplicates = async (meetingId) => {
  const targetMeeting = await Meeting.findById(meetingId).lean();
  if (!targetMeeting) throw new Error("Meeting not found");

  const orgId = targetMeeting.organization;
  if (!orgId) return []; // Only support org meetings for now

  // Search window: ±48 hours
  const targetDate = new Date(targetMeeting.date || targetMeeting.createdAt);
  const startDate = new Date(targetDate.getTime() - 48 * 60 * 60 * 1000);
  const endDate = new Date(targetDate.getTime() + 48 * 60 * 60 * 1000);

  // Find candidates
  const candidates = await Meeting.find({
    _id: { $ne: targetMeeting._id },
    organization: orgId,
    deletedAt: null,
    $or: [
      { date: { $gte: startDate, $lte: endDate } },
      { createdAt: { $gte: startDate, $lte: endDate } },
    ],
  }).lean();

  if (candidates.length === 0) return [];

  // Find already dismissed pairs
  const dismissedPairs = await DismissedDuplicate.find({
    $or: [
      {
        meetingA: targetMeeting._id,
        meetingB: { $in: candidates.map((c) => c._id) },
      },
      {
        meetingB: targetMeeting._id,
        meetingA: { $in: candidates.map((c) => c._id) },
      },
    ],
  }).lean();

  const dismissedSet = new Set(
    dismissedPairs.map((d) =>
      d.meetingA.toString() === targetMeeting._id.toString()
        ? d.meetingB.toString()
        : d.meetingA.toString(),
    ),
  );

  const duplicates = [];

  for (const candidate of candidates) {
    if (dismissedSet.has(candidate._id.toString())) continue;

    // Use textSimilarity for title
    const similarity = computeTextSimilarity(
      targetMeeting.title,
      candidate.title,
    );

    // If titles are very similar (>= 0.7)
    if (similarity >= 0.7) {
      duplicates.push({
        _id: candidate._id,
        title: candidate.title,
        date: candidate.date,
        createdAt: candidate.createdAt,
        similarity: parseFloat(similarity.toFixed(2)),
      });
    }
  }

  // Sort by highest similarity
  duplicates.sort((a, b) => b.similarity - a.similarity);

  return duplicates;
};

/**
 * Merges secondary meeting into primary meeting, preserving data and soft-deleting the secondary.
 */
export const mergeMeetings = async (primaryId, secondaryId, userId) => {
  const session = await mongoose.startSession();
  let result;

  try {
    session.startTransaction();

    const primary = await Meeting.findById(primaryId).session(session);
    const secondary = await Meeting.findById(secondaryId).session(session);

    if (!primary || !secondary)
      throw new Error("One or both meetings not found");
    if (
      primary.organization?.toString() !== secondary.organization?.toString()
    ) {
      throw new Error("Cannot merge meetings from different organizations");
    }

    // 1. Merge Participants
    const primaryParticipantIds = new Set(
      primary.participants.filter((p) => p.user).map((p) => p.user.toString()),
    );
    const primaryParticipantEmails = new Set(
      primary.participants
        .filter((p) => p.email)
        .map((p) => p.email.toLowerCase()),
    );

    for (const p of secondary.participants) {
      const hasUser = p.user && primaryParticipantIds.has(p.user.toString());
      const hasEmail =
        p.email && primaryParticipantEmails.has(p.email.toLowerCase());

      if (!hasUser && !hasEmail) {
        primary.participants.push(p);
      }
    }

    // 2. Append Transcript
    if (secondary.transcript) {
      const appendText = `\n\n--- Appended from Duplicate Meeting ---\n\n${secondary.transcript}`;
      primary.transcript = (primary.transcript || "") + appendText;
    }

    // 3. Move related documents (Attachments, Comments, Tasks, Decisions, KeyMoments)
    await Attachment.updateMany(
      { meetingId: secondaryId }, // some models use meetingId, some use meeting
      { meetingId: primaryId },
      { session },
    );
    await Attachment.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );
    await Comment.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );
    await FollowUpTask.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );
    await Decision.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );
    await KeyMoment.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );

    // 4. Soft-delete secondary meeting
    secondary.deletedAt = new Date();
    secondary.deletedBy = userId;
    secondary.deletionReason = `Merged as duplicate into meeting ${primaryId}`;

    await primary.save({ session });
    await secondary.save({ session });

    await session.commitTransaction();
    result = { success: true, primaryId };
  } catch (error) {
    await session.abortTransaction();
    console.error("Merge error:", error);
    throw new Error("Merge failed: " + error.message);
  } finally {
    session.endSession();
  }

  return result;
};

/**
 * Dismisses a suggested duplicate pair.
 */
export const dismissDuplicate = async (primaryId, secondaryId, userId) => {
  // Always store ordered so index works efficiently and prevents both [A, B] and [B, A]
  const [meetingA, meetingB] =
    primaryId.toString() < secondaryId.toString()
      ? [primaryId, secondaryId]
      : [secondaryId, primaryId];

  await DismissedDuplicate.findOneAndUpdate(
    { meetingA, meetingB },
    { meetingA, meetingB, dismissedBy: userId },
    { upsert: true, new: true },
  );

  return { success: true };
};
