import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
  },
  selectedOptionIndex: {
    type: Number,
    required: true,
  },
});

const quizResponseSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingQuiz",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    answers: [answerSchema],
  },
  { timestamps: true },
);

// A user should only submit once per quiz
quizResponseSchema.index({ quizId: 1, userId: 1 }, { unique: true });

const QuizResponse = mongoose.model("QuizResponse", quizResponseSchema);
export default QuizResponse;
