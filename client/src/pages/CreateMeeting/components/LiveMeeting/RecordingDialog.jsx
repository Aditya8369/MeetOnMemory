import { Video, CheckCircle } from "lucide-react";

const RecordingDialog = ({ handleRecordingChoice }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/50 rounded-full flex items-center justify-center">
            <Video className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Recording Permission
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose recording option
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Do you want to record this meeting for AI transcription and
            summarization?
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
            <strong className="text-blue-900 dark:text-blue-200">
              With Recording:
            </strong>{" "}
            AI will transcribe the meeting in real-time and generate a summary
            with action items after the meeting ends.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleRecordingChoice(false)}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            No, Skip Recording
          </button>
          <button
            onClick={() => handleRecordingChoice(true)}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle size={18} />
            Yes, Record
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingDialog;
