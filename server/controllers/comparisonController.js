import Meeting from "../models/meetingModel.js";
import ComparisonService from "../services/ComparisonService.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";
import { resolveAccessibleMeeting } from "../utils/resolveAccessibleMeeting.js";

/**
 * Reject the whole comparison when any meeting fails authorization (#1403).
 * Never continue into ComparisonService / AI with a partial authorized set.
 */
const rejectIfUnauthorized = (res, access) => {
  if (!access.error) return false;
  res.status(access.error.status).json({ message: access.error.message });
  return true;
};

// @desc    Compare two meetings (summary, decisions, action items)
// @route   POST /api/comparison/compare
// @access  Private
export const compareMeetings = async (req, res) => {
  try {
    const { meetingIdA, meetingIdB } = req.body;

    if (
      !meetingIdA ||
      !meetingIdB ||
      typeof meetingIdA !== "string" ||
      typeof meetingIdB !== "string"
    ) {
      return res.status(400).json({
        message:
          "Both meetingIdA and meetingIdB are required and must be strings",
      });
    }

    // Ignore any client-supplied organization fields — membership comes from req.user.
    // Authorize EVERY meeting independently before comparison / AI work (#1403).
    const accessA = await resolveAccessibleMeeting(meetingIdA, req.user);
    if (rejectIfUnauthorized(res, accessA)) return;

    const accessB = await resolveAccessibleMeeting(meetingIdB, req.user);
    if (rejectIfUnauthorized(res, accessB)) return;

    const meetingA = accessA.meeting;
    const meetingB = accessB.meeting;

    // Compute Diffs — only authorized documents reach ComparisonService
    const actionItemsA = meetingA.structuredMoM?.action_items || [];
    const actionItemsB = meetingB.structuredMoM?.action_items || [];
    const actionItemsDiff = ComparisonService.computeItemDiff(
      actionItemsA,
      actionItemsB,
      "action_item",
    );

    const decisionsA = meetingA.structuredMoM?.decisions || [];
    const decisionsB = meetingB.structuredMoM?.decisions || [];
    const decisionsDiff = ComparisonService.computeItemDiff(
      decisionsA,
      decisionsB,
      "decision",
    );

    // Generate AI Summary
    const aiSummary = await ComparisonService.generateAiDiffSummary(
      meetingA,
      meetingB,
    );

    res.json({
      meetingA: {
        _id: meetingA._id,
        title: meetingA.title,
        date: meetingA.date,
        summary: meetingA.summary,
      },
      meetingB: {
        _id: meetingB._id,
        title: meetingB.title,
        date: meetingB.date,
        summary: meetingB.summary,
      },
      actionItemsDiff,
      decisionsDiff,
      aiSummary,
    });
  } catch (error) {
    console.error("Error in compareMeetings:", error);
    res.status(500).json({ message: "Server error during meeting comparison" });
  }
};

// @desc    Get a list of comparable meetings for a given meeting
// @route   GET /api/comparison/comparable/:meetingId
// @access  Private
export const getComparableMeetings = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const access = await resolveAccessibleMeeting(meetingId, req.user);
    if (rejectIfUnauthorized(res, access)) return;

    const baseMeeting = access.meeting;

    // Candidate pool is scoped to the authorized meeting's org (or owner-only).
    // Never accept a client organization override.
    const query = {
      _id: { $ne: baseMeeting._id },
    };

    if (baseMeeting.organization) {
      query.organization = baseMeeting.organization;
    } else {
      query.uploadedBy = req.user._id;
    }

    const comparableMeetings = await Meeting.find(query)
      .sort({ date: -1 })
      .limit(10)
      .select("title date summary series tags organization uploadedBy");

    // Defense in depth: only return meetings the caller can independently access.
    const authorized = comparableMeetings.filter((m) =>
      canAccessMeetingDoc(m, req.user),
    );

    res.json(
      authorized.map((m) => ({
        _id: m._id,
        title: m.title,
        date: m.date,
        summary: m.summary,
        series: m.series,
        tags: m.tags,
      })),
    );
  } catch (error) {
    console.error("Error in getComparableMeetings:", error);
    res
      .status(500)
      .json({ message: "Server error fetching comparable meetings" });
  }
};
