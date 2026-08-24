import MeetingQuiz from "../models/meetingQuizModel.js";
import QuizResponse from "../models/quizResponseModel.js";
import Meeting from "../models/meetingModel.js";

export const getQuizForMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const quiz = await MeetingQuiz.findOne({ meetingId }).lean();
    if (!quiz) {
      return res
        .status(404)
        .json({ message: "No quiz found for this meeting" });
    }

    const existingResponse = await QuizResponse.findOne({
      quizId: quiz._id,
      userId,
    }).lean();

    // If user hasn't taken it, strip out correct answers and explanations
    if (!existingResponse) {
      quiz.questions = quiz.questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
      }));
    }

    res.json({
      quiz,
      response: existingResponse || null,
    });
  } catch (error) {
    console.error("Error fetching meeting quiz:", error);
    res.status(500).json({ message: "Failed to fetch meeting quiz" });
  }
};

export const submitQuizResponse = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    const { answers } = req.body;

    const quiz = await MeetingQuiz.findOne({ meetingId });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const existingResponse = await QuizResponse.findOne({
      quizId: quiz._id,
      userId,
    });

    if (existingResponse) {
      return res.status(400).json({
        message: "You have already submitted a response for this quiz.",
      });
    }

    let correctCount = 0;
    const processedAnswers = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers.find((a) => a.questionIndex === index);
      const selectedOptionIndex = userAnswer
        ? userAnswer.selectedOptionIndex
        : -1;

      if (selectedOptionIndex === question.correctOptionIndex) {
        correctCount++;
      }

      processedAnswers.push({
        questionIndex: index,
        selectedOptionIndex,
      });
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    const response = await QuizResponse.create({
      quizId: quiz._id,
      userId,
      score,
      answers: processedAnswers,
    });

    res.json({
      message: "Quiz submitted successfully",
      score,
      quiz, // Send back the full quiz so they can see correct answers and explanations
      response,
    });
  } catch (error) {
    console.error("Error submitting quiz response:", error);
    res.status(500).json({ message: "Failed to submit quiz response" });
  }
};

export const getQuizAnalytics = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Check if user is organizer or has access. Assuming req.user has been verified in middleware.
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const quiz = await MeetingQuiz.findOne({ meetingId }).lean();
    if (!quiz) {
      return res
        .status(404)
        .json({ message: "Quiz not found for this meeting" });
    }

    const responses = await QuizResponse.find({ quizId: quiz._id }).lean();

    const totalParticipants = responses.length;
    let totalScore = 0;

    // questionIndex -> number of incorrect answers
    const missedCounts = {};

    responses.forEach((response) => {
      totalScore += response.score;
      response.answers.forEach((answer) => {
        const question = quiz.questions[answer.questionIndex];
        if (
          question &&
          answer.selectedOptionIndex !== question.correctOptionIndex
        ) {
          missedCounts[answer.questionIndex] =
            (missedCounts[answer.questionIndex] || 0) + 1;
        }
      });
    });

    const averageScore =
      totalParticipants > 0 ? Math.round(totalScore / totalParticipants) : 0;

    const questionStats = quiz.questions.map((q, index) => ({
      questionText: q.questionText,
      missedCount: missedCounts[index] || 0,
      missRate:
        totalParticipants > 0
          ? Math.round(((missedCounts[index] || 0) / totalParticipants) * 100)
          : 0,
    }));

    // Sort to highlight most missed questions first
    questionStats.sort((a, b) => b.missRate - a.missRate);

    res.json({
      totalParticipants,
      averageScore,
      questionStats,
    });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({ message: "Failed to fetch quiz analytics" });
  }
};
