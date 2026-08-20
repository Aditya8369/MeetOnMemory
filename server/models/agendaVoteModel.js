import mongoose from "mongoose";

const agendaVoteSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    agendaItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vote: {
      type: Number,
      enum: [1, -1],
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate votes per user for the same agenda item
agendaVoteSchema.index(
  { meetingId: 1, agendaItemId: 1, userId: 1 },
  { unique: true },
);

const AgendaVote = mongoose.model("AgendaVote", agendaVoteSchema);

export default AgendaVote;
