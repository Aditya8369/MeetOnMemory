import React, { useState } from 'react'
import { useMeetingQuiz } from '../../hooks/useMeetingQuiz'
import { X, CheckCircle, XCircle } from 'lucide-react'

const RetentionQuizModal = ({ isOpen, onClose, meetingId, quizData, onSubmitSuccess }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const { submitAnswers, loading } = useMeetingQuiz(meetingId)

  if (!isOpen || !quizData?.quiz) return null

  const { quiz, response } = quizData
  const isCompleted = !!response

  const handleOptionSelect = (questionIndex, optionIndex) => {
    if (isCompleted) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }))
  }

  const handleSubmit = async () => {
    const formattedAnswers = Object.keys(selectedAnswers).map((qIndex) => ({
      questionIndex: parseInt(qIndex),
      selectedOptionIndex: selectedAnswers[qIndex],
    }))

    // We need an answer for every question
    if (formattedAnswers.length !== quiz.questions.length) {
      alert('Please answer all questions before submitting.')
      return
    }

    try {
      const result = await submitAnswers(formattedAnswers)
      if (onSubmitSuccess) {
        onSubmitSuccess(result)
      }
    } catch {
      alert('Failed to submit quiz.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto pt-10 pb-10">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Knowledge Retention Quiz</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isCompleted && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Quiz Completed!</h3>
              <p className="text-blue-700">
                Your score: <span className="font-bold text-2xl">{response.score}%</span>
              </p>
            </div>
          )}

          <div className="space-y-8">
            {quiz.questions.map((q, qIndex) => {
              const selectedOption = isCompleted
                ? response.answers.find((a) => a.questionIndex === qIndex)?.selectedOptionIndex
                : selectedAnswers[qIndex]

              const isCorrect = isCompleted && selectedOption === q.correctOptionIndex
              const isWrong = isCompleted && selectedOption !== q.correctOptionIndex

              return (
                <div key={qIndex} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-start gap-2">
                    <span className="text-gray-500 font-normal">{qIndex + 1}.</span>
                    {q.questionText}
                    {isCompleted && isCorrect && (
                      <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={20} />
                    )}
                    {isCompleted && isWrong && (
                      <XCircle className="text-red-500 mt-1 flex-shrink-0" size={20} />
                    )}
                  </h4>

                  <div className="space-y-3 pl-6">
                    {q.options.map((opt, oIndex) => {
                      let optionClass =
                        'w-full text-left px-4 py-3 rounded-lg border transition-all '

                      if (!isCompleted) {
                        optionClass +=
                          selectedAnswers[qIndex] === oIndex
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                      } else {
                        if (oIndex === q.correctOptionIndex) {
                          optionClass += 'border-green-500 bg-green-50 text-green-800 font-medium'
                        } else if (selectedOption === oIndex) {
                          optionClass += 'border-red-500 bg-red-50 text-red-800'
                        } else {
                          optionClass += 'border-gray-200 bg-white text-gray-500 opacity-75'
                        }
                      }

                      return (
                        <button
                          key={oIndex}
                          onClick={() => handleOptionSelect(qIndex, oIndex)}
                          disabled={isCompleted}
                          className={optionClass}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>

                  {isCompleted && (
                    <div className="mt-4 pl-6">
                      <div
                        className={`p-4 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-orange-50 border border-orange-100 text-orange-800'}`}
                      >
                        <p className="font-semibold mb-1">Explanation:</p>
                        <p>{q.explanation || 'No explanation provided.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {!isCompleted && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
            <button
              onClick={handleSubmit}
              disabled={loading || Object.keys(selectedAnswers).length !== quiz.questions.length}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Answers'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RetentionQuizModal
