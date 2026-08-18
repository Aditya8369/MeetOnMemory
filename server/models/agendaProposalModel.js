import mongoose from "mongoose";

const agendaProposalSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for AI generated
    },
    text: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    estimatedDuration: {
      type: Number,
      default: 15, // minutes
    },
    source: {
      type: String,
      enum: ["participant", "ai", "carry-forward"],
      default: "participant",
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // Reference to action_item, previous meeting, etc. if applicable
    },
    status: {
      type: String,
      enum: ["proposed", "accepted", "rejected"],
      default: "proposed",
      index: true,
    },
    voteScore: {
      type: Number,
      default: 0,
    },
    voters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    position: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const AgendaProposal = mongoose.model("AgendaProposal", agendaProposalSchema);

export default AgendaProposal;
