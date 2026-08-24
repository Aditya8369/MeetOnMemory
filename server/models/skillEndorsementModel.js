import mongoose from "mongoose";

const skillEndorsementSchema = new mongoose.Schema(
  {
    endorserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    skillTag: {
      type: String,
      required: true,
      trim: true,
    },
    comment: {
      type: String,
      trim: true,
      maxLength: 250,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  {
    timestamps: true,
  },
);

// Prevent multiple endorsements for the same skill from the same user in the same meeting
skillEndorsementSchema.index(
  { endorserId: 1, recipientId: 1, meetingId: 1, skillTag: 1 },
  { unique: true },
);

const SkillEndorsement = mongoose.model(
  "SkillEndorsement",
  skillEndorsementSchema,
);

export default SkillEndorsement;
