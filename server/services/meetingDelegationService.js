import MeetingDelegation from "../models/meetingDelegationModel.js";
import ActionItem from "../models/actionItemModel.js";
import Meeting from "../models/meetingModel.js";
import {
  generateDelegationContextBriefing,
  generateDelegationPostMeetingReport,
} from "./GenerativeAIService.js";
import { notifyUser } from "./notificationService.js";

/**
 * Creates a delegation request and generates a context briefing.
 */
export const createDelegationRequest = async (
  meetingId,
  delegatorId,
  delegateeId,
  scope,
  delegatorName,
  delegateeName,
  meetingTitle,
) => {
  // Check if a delegation already exists for this meeting by this delegator
  const existing = await MeetingDelegation.findOne({ meetingId, delegatorId });
  if (existing) {
    throw new Error("A delegation request already exists for this meeting.");
  }

  // Generate context briefing using Gemini
  const openActionItems = await ActionItem.find({
    assignee: delegatorId,
    status: { $in: ["open", "in-progress", "pending"] },
  }).lean();

  const recentMeetings = await Meeting.find({
    participants: { $elemMatch: { user: delegatorId } },
  })
    .sort({ date: -1 })
    .limit(3)
    .lean();

  const recentMeetingNotes = recentMeetings.map((m) => m.summary).join("\n");

  const contextBriefing = await generateDelegationContextBriefing(
    meetingTitle,
    delegatorName,
    delegateeName,
    openActionItems,
    recentMeetingNotes,
  );

  const delegation = new MeetingDelegation({
    meetingId,
    delegatorId,
    delegateeId,
    scope,
    status: "pending",
    contextBriefing,
  });

  await delegation.save();

  // Notify delegatee
  await notifyUser(
    delegateeId,
    "delegation_requested",
    `${delegatorName} has requested you to represent them in the meeting: ${meetingTitle}`,
    { meetingId, delegationId: delegation._id },
  );

  return delegation;
};

/**
 * Approves a delegation request.
 * Temporarily reassigns action items if the scope includes 'action_items'.
 */
export const approveDelegationRequest = async (delegationId) => {
  const delegation = await MeetingDelegation.findById(delegationId).populate(
    "meetingId delegatorId delegateeId",
  );
  if (!delegation) throw new Error("Delegation not found");
  if (delegation.status !== "pending")
    throw new Error("Delegation is not pending");

  delegation.status = "approved";

  if (
    delegation.scope.includes("action_items") ||
    delegation.scope.includes("full")
  ) {
    const actionItems = await ActionItem.find({
      sourceMeetingId: delegation.meetingId._id,
      assignee: delegation.delegatorId._id,
      status: { $in: ["open", "in-progress", "pending"] },
    });

    const temporarilyDelegatedActionItems = [];
    for (const item of actionItems) {
      item.assignee = delegation.delegateeId._id;
      item.owner = delegation.delegateeId.name;
      await item.save();
      temporarilyDelegatedActionItems.push(item._id);
    }
    delegation.temporarilyDelegatedActionItems =
      temporarilyDelegatedActionItems;
  }

  await delegation.save();

  await notifyUser(
    delegation.delegatorId._id,
    "delegation_approved",
    `${delegation.delegateeId.name} has accepted your delegation request for the meeting: ${delegation.meetingId.title}`,
    { meetingId: delegation.meetingId._id },
  );

  return delegation;
};

/**
 * Rejects a delegation request.
 */
export const rejectDelegationRequest = async (delegationId) => {
  const delegation = await MeetingDelegation.findById(delegationId).populate(
    "meetingId delegatorId delegateeId",
  );
  if (!delegation) throw new Error("Delegation not found");
  if (delegation.status !== "pending")
    throw new Error("Delegation is not pending");

  delegation.status = "rejected";
  await delegation.save();

  await notifyUser(
    delegation.delegatorId._id,
    "delegation_rejected",
    `${delegation.delegateeId.name} has declined your delegation request for the meeting: ${delegation.meetingId.title}`,
    { meetingId: delegation.meetingId._id },
  );

  return delegation;
};

/**
 * Revokes a delegation request and reverts any action item reassignments.
 */
export const revokeDelegationRequest = async (delegationId) => {
  const delegation = await MeetingDelegation.findById(delegationId).populate(
    "meetingId delegatorId delegateeId",
  );
  if (!delegation) throw new Error("Delegation not found");

  delegation.status = "revoked";

  if (delegation.temporarilyDelegatedActionItems.length > 0) {
    const actionItems = await ActionItem.find({
      _id: { $in: delegation.temporarilyDelegatedActionItems },
    });
    for (const item of actionItems) {
      // Revert if still open/in-progress and still assigned to delegatee
      if (
        ["open", "in-progress", "pending"].includes(item.status) &&
        item.assignee.toString() === delegation.delegateeId._id.toString()
      ) {
        item.assignee = delegation.delegatorId._id;
        item.owner = delegation.delegatorId.name;
        await item.save();
      }
    }
    delegation.temporarilyDelegatedActionItems = [];
  }

  await delegation.save();

  await notifyUser(
    delegation.delegateeId._id,
    "delegation_revoked",
    `${delegation.delegatorId.name} has revoked their delegation for the meeting: ${delegation.meetingId.title}`,
    { meetingId: delegation.meetingId._id },
  );

  return delegation;
};

/**
 * Completes a delegation post-meeting, generates report, and finalizes items.
 */
export const completeDelegation = async (meetingId) => {
  const delegations = await MeetingDelegation.find({
    meetingId,
    status: "approved",
  }).populate("meetingId delegatorId delegateeId");

  const meeting = await Meeting.findById(meetingId);

  const allActionItems = await ActionItem.find({
    sourceMeetingId: meetingId,
  }).lean();

  for (const delegation of delegations) {
    // Generate post meeting report
    const report = await generateDelegationPostMeetingReport(
      meeting.title,
      delegation.delegatorId.name,
      delegation.delegateeId.name,
      meeting.summary,
      allActionItems,
      meeting.structuredMoM?.decisions || [],
    );

    delegation.postMeetingReport = report;
    delegation.status = "completed";

    // Revert action items unless completed
    if (delegation.temporarilyDelegatedActionItems.length > 0) {
      const actionItems = await ActionItem.find({
        _id: { $in: delegation.temporarilyDelegatedActionItems },
      });
      for (const item of actionItems) {
        if (["open", "in-progress", "pending"].includes(item.status)) {
          item.assignee = delegation.delegatorId._id;
          item.owner = delegation.delegatorId.name;
          await item.save();
        }
      }
    }

    await delegation.save();

    await notifyUser(
      delegation.delegatorId._id,
      "delegation_completed",
      `Your post-meeting report is ready for the meeting: ${meeting.title}`,
      { meetingId: delegation.meetingId._id, delegationId: delegation._id },
    );
  }
};
