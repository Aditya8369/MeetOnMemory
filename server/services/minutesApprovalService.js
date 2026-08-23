import MinutesApproval from "../models/minutesApprovalModel.js";
import Meeting from "../models/meetingModel.js";
import { createNotifications } from "./notificationService.js";

export const getApprovalStatus = async (meetingId) => {
  return await MinutesApproval.findOne({ meetingId })
    .populate("approvals.approver", "firstName lastName email profileImageUrl")
    .populate("submittedBy", "firstName lastName email profileImageUrl");
};

export const submitForApproval = async (
  meetingId,
  submitterId,
  summary,
  approverIds,
) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // Format approvers array
  const approvals = approverIds.map((id) => ({
    approver: id,
    status: "pending",
  }));

  let approvalDoc = await MinutesApproval.findOne({ meetingId });

  if (approvalDoc) {
    // Reset/update existing document
    approvalDoc.submittedBy = submitterId;
    approvalDoc.snapshotSummary = summary;
    approvalDoc.status = "pending";
    approvalDoc.approvals = approvals;
    await approvalDoc.save();
  } else {
    // Create new
    approvalDoc = await MinutesApproval.create({
      meetingId,
      submittedBy: submitterId,
      snapshotSummary: summary,
      status: "pending",
      approvals,
    });
  }

  // Notify approvers
  await createNotifications(approverIds, {
    title: "Meeting Minutes Approval Required",
    description: `You have been requested to review and approve the minutes for "${meeting.title}".`,
    category: "meetings",
    actionUrl: `/meeting/${meetingId}`,
    actionLabel: "Review Minutes",
    metadata: { meetingId },
  });

  return await getApprovalStatus(meetingId);
};

export const respondToApproval = async (
  meetingId,
  approverId,
  status,
  comment,
) => {
  const approvalDoc = await MinutesApproval.findOne({ meetingId });

  if (!approvalDoc) {
    throw new Error("Approval document not found");
  }

  const approverRecord = approvalDoc.approvals.find(
    (a) => a.approver.toString() === approverId.toString(),
  );

  if (!approverRecord) {
    throw new Error("You are not listed as an approver for this meeting");
  }

  approverRecord.status = status;
  approverRecord.comment = comment || "";
  approverRecord.respondedAt = new Date();

  // Check overall status
  const allApproved = approvalDoc.approvals.every(
    (a) => a.status === "approved",
  );
  const anyRejected = approvalDoc.approvals.some(
    (a) => a.status === "rejected",
  );

  if (anyRejected) {
    approvalDoc.status = "rejected";
  } else if (allApproved) {
    approvalDoc.status = "approved";
  } else {
    approvalDoc.status = "pending";
  }

  await approvalDoc.save();

  const meeting = await Meeting.findById(meetingId);

  // Notify the submitter that someone responded
  await createNotifications([approvalDoc.submittedBy], {
    title: `Minutes ${status === "approved" ? "Approved" : "Rejected"}`,
    description: `An approver has ${status} the minutes for "${meeting?.title || "a meeting"}".`,
    category: "meetings",
    actionUrl: `/meeting/${meetingId}`,
    actionLabel: "View Details",
    metadata: { meetingId, approverId },
  });

  return await getApprovalStatus(meetingId);
};
