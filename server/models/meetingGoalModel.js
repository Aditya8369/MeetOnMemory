import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: "",
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ["pending", "achieved", "partially_achieved", "not_achieved"],
    default: "pending",
  },
  outcomeNote: {
    type: String,
    default: "",
    trim: true,
    maxlength: 2000,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
});

const meetingGoalSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goals: {
      type: [goalSchema],
      validate: [
        (val) => val.length <= 5,
        "{PATH} exceeds the limit of 5 goals",
      ],
      default: [],
    },
  },
  { timestamps: true },
);

meetingGoalSchema.index({ meetingId: 1 });
meetingGoalSchema.index({ organization: 1 });

const MeetingGoal = mongoose.model("MeetingGoal", meetingGoalSchema);

export default MeetingGoal;
