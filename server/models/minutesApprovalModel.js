import mongoose from "mongoose";

const minutesApprovalSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true, // One approval document per meeting
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    snapshotSummary: {
      type: String, // The exact summary text at the time of submission
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvals: [
      {
        approver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        comment: {
          type: String,
          default: "",
        },
        respondedAt: {
          type: Date,
          default: null,
        },
      },
    ],
  },
  { timestamps: true },
);

// Indexes
minutesApprovalSchema.index({ meetingId: 1 });
minutesApprovalSchema.index({ "approvals.approver": 1 });

const MinutesApproval = mongoose.model(
  "MinutesApproval",
  minutesApprovalSchema,
);

export default MinutesApproval;
