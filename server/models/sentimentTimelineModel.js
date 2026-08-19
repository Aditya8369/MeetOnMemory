import mongoose from "mongoose";

const segmentSchema = new mongoose.Schema({
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"],
    required: true,
  },
  score: {
    type: Number, // -1 to 1
    required: true,
  },
  textSnippet: {
    type: String,
    default: "",
  },
  agendaItemIndex: {
    type: Number, // null if it doesn't align with any agenda item
    default: null,
  },
  agendaItemText: {
    type: String,
    default: null,
  },
});

const sentimentTimelineSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true, // One timeline per meeting
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    segments: [segmentSchema],
    overallArc: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

sentimentTimelineSchema.index({ meeting: 1 });

const SentimentTimeline = mongoose.model(
  "SentimentTimeline",
  sentimentTimelineSchema,
);
export default SentimentTimeline;
