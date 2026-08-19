import Meeting from "../models/meetingModel.js";
import Transcript from "../models/transcriptModel.js";
import ActionItem from "../models/actionItemModel.js";
import DismissedDuplicate from "../models/dismissedDuplicateModel.js";
import MergeAudit from "../models/mergeAuditModel.js";
import AuditLog from "../models/auditLogModel.js";
import {
  computeTextSimilarity,
  jaccardSimilarity,
} from "../utils/textSimilarity.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";

import Comment from "../models/commentModel.js";
import Attachment from "../models/attachmentModel.js";
import FollowUpTask from "../models/FollowUpTask.js";
import Decision from "../models/decisionModel.js";
import KeyMoment from "../models/keyMomentModel.js";

// ── Configurable thresholds ─────────────────────────────────────────────
export const THRESHOLDS = {
  TIME_WINDOW_MS: 48 * 60 * 60 * 1000,
  TITLE_SIMILARITY_MIN: 0.55,
  COMPOSITE_SCORE_MIN: 0.45,
  HIGH_CONFIDENCE: 0.75,
  TRANSCRIPT_SAMPLE_LENGTH: 5000,
};

// ── Signal weights for composite scoring ────────────────────────────────
const WEIGHTS = {
  title: 0.3,
  time: 0.15,
  participants: 0.25,
  transcript: 0.3,
};

// ── Scoring helpers ─────────────────────────────────────────────────────

function computeTimeProximityScore(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const diffMs = Math.abs(
    new Date(dateA).getTime() - new Date(dateB).getTime(),
  );
  if (diffMs === 0) return 1;
  if (diffMs >= THRESHOLDS.TIME_WINDOW_MS) return 0;
  return 1 - diffMs / THRESHOLDS.TIME_WINDOW_MS;
}

function computeParticipantOverlap(participantsA, participantsB) {
  if (!participantsA?.length || !participantsB?.length) return 0;

  const setA = new Set();
  for (const p of participantsA) {
    if (p.user) setA.add(p.user.toString());
    if (p.email) setA.add(p.email.toLowerCase());
  }

  let matches = 0;
  const checked = new Set();
  for (const p of participantsB) {
    const uid = p.user?.toString();
    const email = p.email?.toLowerCase();
    if (uid && setA.has(uid) && !checked.has(uid)) {
      matches++;
      checked.add(uid);
    } else if (email && setA.has(email) && !checked.has(email)) {
      matches++;
      checked.add(email);
    }
  }

  const uniqueA = new Set(
    participantsA
      .map((p) => p.user?.toString() || p.email?.toLowerCase())
      .filter(Boolean),
  );
  const uniqueB = new Set(
    participantsB
      .map((p) => p.user?.toString() || p.email?.toLowerCase())
      .filter(Boolean),
  );
  const union = new Set([...uniqueA, ...uniqueB]).size;

  return union === 0 ? 0 : matches / union;
}

function sampleText(text, maxLen) {
  if (!text || typeof text !== "string") return "";
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

function confidenceLevel(score) {
  if (score >= THRESHOLDS.HIGH_CONFIDENCE) return "high";
  if (score >= THRESHOLDS.COMPOSITE_SCORE_MIN) return "medium";
  return "low";
}

// ── Duplicate detection ─────────────────────────────────────────────────

/**
 * Find potential duplicate meetings using multiple signals:
 * title similarity, time proximity, participant overlap, and transcript similarity.
 */
export const findDuplicates = async (meetingId) => {
  const targetMeeting = await Meeting.findById(meetingId).lean();
  if (!targetMeeting) throw new Error("Meeting not found");

  const orgId = targetMeeting.organization;
  if (!orgId) return [];

  const targetDate = new Date(targetMeeting.date || targetMeeting.createdAt);
  const startDate = new Date(targetDate.getTime() - THRESHOLDS.TIME_WINDOW_MS);
  const endDate = new Date(targetDate.getTime() + THRESHOLDS.TIME_WINDOW_MS);

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

  const alreadyMerged = await MergeAudit.find({
    $or: [
      {
        primaryMeeting: targetMeeting._id,
        secondaryMeeting: { $in: candidates.map((c) => c._id) },
      },
      {
        secondaryMeeting: targetMeeting._id,
        primaryMeeting: { $in: candidates.map((c) => c._id) },
      },
    ],
    rolledBack: false,
  })
    .select("primaryMeeting secondaryMeeting")
    .lean();

  const mergedSet = new Set(
    alreadyMerged.flatMap((m) => [
      m.primaryMeeting.toString(),
      m.secondaryMeeting.toString(),
    ]),
  );

  const targetTranscript = await Transcript.findOne({
    meeting: targetMeeting._id,
  })
    .select("fullText")
    .lean();
  const targetFullText = sampleText(
    targetTranscript?.fullText,
    THRESHOLDS.TRANSCRIPT_SAMPLE_LENGTH,
  );

  const candidateIds = candidates
    .filter(
      (c) =>
        !dismissedSet.has(c._id.toString()) && !mergedSet.has(c._id.toString()),
    )
    .map((c) => c._id);

  const candidateTranscripts = targetFullText
    ? await Transcript.find({ meeting: { $in: candidateIds } })
        .select("meeting fullText")
        .lean()
    : [];

  const transcriptMap = new Map(
    candidateTranscripts.map((t) => [t.meeting.toString(), t.fullText]),
  );

  const duplicates = [];

  for (const candidate of candidates) {
    if (dismissedSet.has(candidate._id.toString())) continue;
    if (mergedSet.has(candidate._id.toString())) continue;

    const titleScore = computeTextSimilarity(
      targetMeeting.title,
      candidate.title,
    );
    const timeScore = computeTimeProximityScore(
      targetMeeting.date || targetMeeting.createdAt,
      candidate.date || candidate.createdAt,
    );
    const participantScore = computeParticipantOverlap(
      targetMeeting.participants,
      candidate.participants,
    );

    let transcriptScore = 0;
    const candidateText = sampleText(
      transcriptMap.get(candidate._id.toString()),
      THRESHOLDS.TRANSCRIPT_SAMPLE_LENGTH,
    );
    if (targetFullText && candidateText) {
      transcriptScore = jaccardSimilarity(targetFullText, candidateText);
    }

    const compositeScore =
      WEIGHTS.title * titleScore +
      WEIGHTS.time * timeScore +
      WEIGHTS.participants * participantScore +
      WEIGHTS.transcript * transcriptScore;

    if (compositeScore >= THRESHOLDS.COMPOSITE_SCORE_MIN) {
      duplicates.push({
        _id: candidate._id,
        title: candidate.title,
        date: candidate.date,
        createdAt: candidate.createdAt,
        scores: {
          title: parseFloat(titleScore.toFixed(3)),
          time: parseFloat(timeScore.toFixed(3)),
          participants: parseFloat(participantScore.toFixed(3)),
          transcript: parseFloat(transcriptScore.toFixed(3)),
          composite: parseFloat(compositeScore.toFixed(3)),
        },
        confidence: confidenceLevel(compositeScore),
      });
    }
  }

  duplicates.sort((a, b) => b.scores.composite - a.scores.composite);
  return duplicates;
};

// ── Merge pipeline ──────────────────────────────────────────────────────

/**
 * Merges secondary meeting into primary with full data merging,
 * audit trail, and transaction safety.
 */
export const mergeMeetings = async (primaryId, secondaryId, userId) => {
  if (primaryId.toString() === secondaryId.toString()) {
    throw new Error("Cannot merge a meeting with itself");
  }

  const session = await mongoose.startSession();
  let result;

  try {
    session.startTransaction();

    const primary = await Meeting.findById(primaryId).session(session);
    const secondary = await Meeting.findById(secondaryId).session(session);

    if (!primary || !secondary) {
      throw new Error("One or both meetings not found");
    }
    if (primary.deletedAt || secondary.deletedAt) {
      throw new Error("Cannot merge a deleted or already-merged meeting");
    }
    if (
      primary.organization?.toString() !== secondary.organization?.toString()
    ) {
      throw new Error("Cannot merge meetings from different organizations");
    }

    const existingMerge = await MergeAudit.findOne({
      primaryMeeting: primaryId,
      secondaryMeeting: secondaryId,
      rolledBack: false,
    }).session(session);
    if (existingMerge) {
      throw new Error("These meetings have already been merged");
    }

    const orgId = primary.organization;

    // ── 1. Merge participants (dedup by user ID then email) ───────────
    const participantIds = new Set(
      primary.participants.filter((p) => p.user).map((p) => p.user.toString()),
    );
    const participantEmails = new Set(
      primary.participants
        .filter((p) => p.email)
        .map((p) => p.email.toLowerCase()),
    );
    for (const p of secondary.participants) {
      const hasUser = p.user && participantIds.has(p.user.toString());
      const hasEmail = p.email && participantEmails.has(p.email.toLowerCase());
      if (!hasUser && !hasEmail) {
        primary.participants.push(p);
      }
    }

    // ── 2. Merge legacy transcript text ──────────────────────────────
    if (secondary.transcript) {
      primary.transcript =
        (primary.transcript || "") +
        `\n\n--- Merged from meeting ${secondaryId} ---\n\n${secondary.transcript}`;
    }

    // ── 3. Merge transcript segments (dedup by startTime+speaker) ────
    const mergedSegmentIds = [];
    const secondaryTranscript = await Transcript.findOne({
      meeting: secondaryId,
    }).session(session);
    if (secondaryTranscript?.segments?.length) {
      let primaryTranscript = await Transcript.findOne({
        meeting: primaryId,
      }).session(session);
      if (primaryTranscript) {
        const existingKeys = new Set(
          primaryTranscript.segments.map((s) => `${s.startTime}:${s.speaker}`),
        );
        for (const seg of secondaryTranscript.segments) {
          const key = `${seg.startTime}:${seg.speaker}`;
          if (!existingKeys.has(key)) {
            primaryTranscript.segments.push(seg);
            existingKeys.add(key);
          }
        }
        primaryTranscript.segments.sort((a, b) => a.startTime - b.startTime);

        const texts = primaryTranscript.segments.map((s) => s.text).join(" ");
        primaryTranscript.fullText = texts;
        primaryTranscript.wordCount = texts.split(/\s+/).filter(Boolean).length;
        await primaryTranscript.save({ session });
        mergedSegmentIds.push(
          ...secondaryTranscript.segments.map((s) => s._id),
        );
      } else {
        secondaryTranscript.meeting = primary._id;
        await secondaryTranscript.save({ session });
      }
    }

    // ── 4. Re-parent action items ────────────────────────────────────
    const secondaryActions = await ActionItem.find({
      sourceMeetingId: secondaryId,
    }).session(session);

    const reparentedActionItemIds = [];
    for (const ai of secondaryActions) {
      const duplicate = await ActionItem.findOne({
        sourceMeetingId: primaryId,
        text: ai.text,
        organization: orgId,
      }).session(session);
      if (!duplicate) {
        ai.sourceMeetingId = primaryId;
        await ai.save({ session });
        reparentedActionItemIds.push(ai._id);
      }
    }

    // ── 5. Re-parent key moments (dedup by startTime+snippet) ────────
    const secondaryMoments = await KeyMoment.find({
      meetingId: secondaryId,
    }).session(session);

    const reparentedKeyMomentIds = [];
    const primaryMomentKeys = new Set(
      (
        await KeyMoment.find({ meetingId: primaryId }).session(session).lean()
      ).map((m) => `${m.startTime}:${m.snippet}`),
    );

    for (const km of secondaryMoments) {
      const key = `${km.startTime}:${km.snippet}`;
      if (!primaryMomentKeys.has(key)) {
        km.meetingId = primaryId;
        await km.save({ session });
        reparentedKeyMomentIds.push(km._id);
        primaryMomentKeys.add(key);
      }
    }

    // ── 6. Re-parent other child documents ───────────────────────────
    const attachmentResult = await Attachment.updateMany(
      { $or: [{ meetingId: secondaryId }, { meeting: secondaryId }] },
      { $set: { meetingId: primaryId, meeting: primaryId } },
      { session },
    );
    const commentResult = await Comment.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );
    const followUpResult = await FollowUpTask.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );
    const decisionResult = await Decision.updateMany(
      { meeting: secondaryId },
      { meeting: primaryId },
      { session },
    );

    // ── 7. Soft-delete secondary ─────────────────────────────────────
    secondary.deletedAt = new Date();
    secondary.deletedBy = userId;
    secondary.deletionReason = `Merged as duplicate into meeting ${primaryId}`;

    await primary.save({ session });
    await secondary.save({ session });

    // ── 8. Audit trail ───────────────────────────────────────────────
    const audit = await MergeAudit.create(
      [
        {
          organization: orgId,
          primaryMeeting: primaryId,
          secondaryMeeting: secondaryId,
          mergedBy: userId,
          snapshot: {
            secondaryTitle: secondary.title,
            secondaryDate: secondary.date,
            secondaryTranscript: secondary.transcript || "",
            secondaryParticipants: secondary.participants,
            reparentedActionItems: reparentedActionItemIds,
            reparentedKeyMoments: reparentedKeyMomentIds,
            reparentedComments: commentResult.modifiedCount || 0,
            reparentedAttachments: attachmentResult.modifiedCount || 0,
            reparentedDecisions: decisionResult.modifiedCount || 0,
            reparentedFollowUpTasks: followUpResult.modifiedCount || 0,
            mergedTranscriptSegmentIds: mergedSegmentIds,
          },
        },
      ],
      { session },
    );

    await AuditLog.create(
      [
        {
          organization: orgId,
          actor: userId,
          action: "meeting.merge",
          entity: "Meeting",
          entityId: primaryId,
          details: {
            secondaryMeetingId: secondaryId,
            mergeAuditId: audit[0]._id,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();

    result = {
      success: true,
      primaryId,
      mergeAuditId: audit[0]._id,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error("Merge failed", error);
    throw new Error("Merge failed: " + error.message);
  } finally {
    session.endSession();
  }

  return result;
};

// ── Rollback ────────────────────────────────────────────────────────────

/**
 * Rolls back a previous merge, restoring the secondary meeting and
 * re-pointing child documents back.
 */
export const rollbackMerge = async (mergeAuditId, userId) => {
  const audit = await MergeAudit.findById(mergeAuditId);
  if (!audit) throw new Error("Merge audit record not found");
  if (audit.rolledBack)
    throw new Error("This merge has already been rolled back");

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const secondary = await Meeting.findById(audit.secondaryMeeting).session(
      session,
    );
    if (!secondary) throw new Error("Secondary meeting no longer exists");

    secondary.deletedAt = null;
    secondary.deletedBy = null;
    secondary.deletionReason = null;
    await secondary.save({ session });

    const { snapshot } = audit;

    if (snapshot.reparentedActionItems?.length) {
      await ActionItem.updateMany(
        { _id: { $in: snapshot.reparentedActionItems } },
        { sourceMeetingId: audit.secondaryMeeting },
        { session },
      );
    }

    if (snapshot.reparentedKeyMoments?.length) {
      await KeyMoment.updateMany(
        { _id: { $in: snapshot.reparentedKeyMoments } },
        { meetingId: audit.secondaryMeeting },
        { session },
      );
    }

    audit.rolledBack = true;
    audit.rolledBackAt = new Date();
    audit.rolledBackBy = userId;
    await audit.save({ session });

    await AuditLog.create(
      [
        {
          organization: audit.organization,
          actor: userId,
          action: "meeting.merge.rollback",
          entity: "Meeting",
          entityId: audit.primaryMeeting,
          details: {
            mergeAuditId: audit._id,
            secondaryMeetingId: audit.secondaryMeeting,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    logger.error("Merge rollback failed", error);
    throw new Error("Rollback failed: " + error.message);
  } finally {
    session.endSession();
  }
};

/**
 * Dismisses a suggested duplicate pair.
 */
export const dismissDuplicate = async (primaryId, secondaryId, userId) => {
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
