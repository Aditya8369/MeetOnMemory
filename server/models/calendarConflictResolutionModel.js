import mongoose from "mongoose";

const CalendarConflictResolutionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      index: true,
    },
    provider: {
      type: String,
      enum: ["GOOGLE", "OUTLOOK", "CALDAV"],
      required: true,
    },
    externalEventId: {
      type: String,
      required: true,
    },
    localSnapshot: {
      title: String,
      scheduledStartTime: Date,
      scheduledEndTime: Date,
      description: String,
      attendees: [String],
    },
    remoteSnapshot: {
      title: String,
      scheduledStartTime: Date,
      scheduledEndTime: Date,
      description: String,
      attendees: [String],
    },
    conflictFields: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: [
        "DETECTED",
        "LOCAL_CHOSEN",
        "REMOTE_CHOSEN",
        "MERGED",
        "DISMISSED",
      ],
      default: "DETECTED",
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

const CalendarConflictResolution = mongoose.model(
  "CalendarConflictResolution",
  CalendarConflictResolutionSchema,
);

export default CalendarConflictResolution;
