import mongoose from "mongoose";

const RedactionAuditSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: [
        "API_KEY",
        "JWT_TOKEN",
        "CREDIT_CARD",
        "SSN",
        "EMAIL",
        "PHONE",
        "PASSWORD_SECRET",
      ],
      required: true,
    },
    maskedToken: {
      type: String,
      required: true,
    },
    charIndexStart: {
      type: Number,
    },
    charIndexEnd: {
      type: Number,
    },
    contextSnippet: {
      type: String,
    },
    unmaskRequests: [
      {
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
          default: "PENDING",
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reviewedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const RedactionAudit = mongoose.model("RedactionAudit", RedactionAuditSchema);

export default RedactionAudit;
