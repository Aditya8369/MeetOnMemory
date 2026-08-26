import React, { useState } from "react";
import { X, Award, Check } from "lucide-react";
import { useSkillEndorsements } from "../../hooks/useSkillEndorsements";
import { toast } from "react-toastify";

const SKILL_BADGES = [
  { id: "Great Idea", icon: "💡", label: "Great Idea" },
  { id: "De-escalation", icon: "🤝", label: "De-escalation" },
  { id: "Strategic Thinking", icon: "🎯", label: "Strategic Thinking" },
  { id: "Technical Architecture", icon: "🏗️", label: "Technical Architecture" },
  { id: "Clear Communication", icon: "🗣️", label: "Clear Communication" },
  { id: "Action Oriented", icon: "🏃", label: "Action Oriented" },
  { id: "Conflict Resolution", icon: "⚖️", label: "Conflict Resolution" },
  { id: "Deep Expertise", icon: "🧠", label: "Deep Expertise" },
];

const SkillEndorsementModal = ({
  isOpen,
  onClose,
  meetingId,
  participants,
  currentUser,
}) => {
  const { createEndorsement, loading } = useSkillEndorsements();

  const [recipientId, setRecipientId] = useState("");
  const [skillTag, setSkillTag] = useState("");
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState("public");

  if (!isOpen) return null;

  const currentUserId =
    currentUser?.publicMetadata?.dbUserId || currentUser?._id;

  const eligibleRecipients = participants.filter((p) => {
    const pId = p.user?._id || p.user;
    return pId && pId !== currentUserId;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientId || !skillTag) {
      toast.error("Please select a recipient and a skill badge.");
      return;
    }

    const result = await createEndorsement({
      recipientId,
      meetingId,
      skillTag,
      comment,
      visibility,
    });

    if (result) {
      setRecipientId("");
      setSkillTag("");
      setComment("");
      setVisibility("public");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              Recognize a Peer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form
            id="endorsement-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Who do you want to recognize?
              </label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                required
              >
                <option value="">Select a participant...</option>
                {eligibleRecipients.map((p) => {
                  const id = p.user?._id || p.user;
                  return (
                    <option key={id} value={id}>
                      {p.name || p.email}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                What skill did they demonstrate?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_BADGES.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSkillTag(badge.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                      skillTag === badge.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-base">{badge.icon}</span>
                    <span className="truncate">{badge.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Add a short note (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="E.g., Great job handling that tough question!"
                className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 resize-none"
                maxLength={250}
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Visibility
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Make this endorsement visible on their profile
                </p>
              </div>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1.5 px-3"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="endorsement-form"
            disabled={loading || !recipientId || !skillTag}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Recognize
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillEndorsementModal;
