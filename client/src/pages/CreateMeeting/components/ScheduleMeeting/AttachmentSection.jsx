import { Paperclip, X } from "lucide-react";

const AttachmentSection = ({
  attachments,
  handleAttachmentUpload,
  removeAttachment,
}) => {
  return (
    <div className="mb-6">
      <label className="block mb-3 font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Paperclip size={18} /> Attach Supporting Documents
      </label>
      <input
        type="file"
        multiple
        onChange={handleAttachmentUpload}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300"
      />
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-gray-900 dark:text-gray-100"
            >
              <span className="text-sm">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentSection;
