import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: [
    {
      type: String,
      required: true,
    },
  ],
  correctOptionIndex: {
    type: Number,
    required: true,
  },
  explanation: {
    type: String,
    default: "",
  },
});

const meetingQuizSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    questions: [questionSchema],
  },
  { timestamps: true },
);

const MeetingQuiz = mongoose.model("MeetingQuiz", meetingQuizSchema);
export default MeetingQuiz;
