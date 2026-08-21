import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import useMinutesApproval from "../../hooks/useMinutesApproval";

const MinutesApproval = ({ meeting }) => {
  const { user: currentUser } = useUser();
  const { approvalDoc, loading, submitApproval, respondApproval } =
    useMinutesApproval(meeting._id);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState([]);

  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [responseStatus, setResponseStatus] = useState("approved");
  const [responseComment, setResponseComment] = useState("");

  const isOrganizer =
    currentUser?.publicMetadata?.dbUserId === meeting.uploadedBy;
  const currentApproverRecord = approvalDoc?.approvals?.find(
    (a) => a.approver?._id === currentUser?.publicMetadata?.dbUserId,
  );
  const isApprover = !!currentApproverRecord;

  const handleSubmit = async () => {
    if (selectedApprovers.length === 0) return;
    const success = await submitApproval(meeting.summary, selectedApprovers);
    if (success) {
      setIsSubmitModalOpen(false);
      setSelectedApprovers([]);
    }
  };

  const handleRespond = async () => {
    const success = await respondApproval(responseStatus, responseComment);
    if (success) {
      setIsRespondModalOpen(false);
      setResponseComment("");
    }
  };

  const toggleApprover = (userId) => {
    if (selectedApprovers.includes(userId)) {
      setSelectedApprovers(selectedApprovers.filter((id) => id !== userId));
    } else {
      setSelectedApprovers([...selectedApprovers, userId]);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-xl my-4"></div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 my-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Meeting Minutes Approval
            {approvalDoc && (
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  approvalDoc.status === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : approvalDoc.status === "rejected"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {approvalDoc.status.toUpperCase()}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Formal sign-off process for the finalized meeting summary.
          </p>
        </div>

        <div>
          {isOrganizer &&
            (!approvalDoc || approvalDoc.status === "rejected") && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                {approvalDoc ? "Resubmit for Approval" : "Submit for Approval"}
              </button>
            )}

          {isApprover && currentApproverRecord.status === "pending" && (
            <button
              onClick={() => setIsRespondModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition"
            >
              Respond to Approval
            </button>
          )}
        </div>
      </div>

      {approvalDoc &&
        approvalDoc.approvals &&
        approvalDoc.approvals.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Approvers
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvalDoc.approvals.map((approval) => (
                <div
                  key={approval._id}
                  className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          approval.approver?.profileImageUrl ||
                          `https://ui-avatars.com/api/?name=${approval.approver?.firstName}+${approval.approver?.lastName}`
                        }
                        alt="Approver"
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {approval.approver?.firstName}{" "}
                        {approval.approver?.lastName}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        approval.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : approval.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {approval.status}
                    </span>
                  </div>
                  {approval.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-2 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                      "{approval.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Submit Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Select Approvers
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {meeting.participants?.map((p) => {
                const pId = p.user?._id || p.user; // Depends on population
                if (!pId) return null;
                // Don't let organizer approve their own? (Optional, skipping for now)
                return (
                  <label
                    key={pId}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent"
                      checked={selectedApprovers.includes(pId)}
                      onChange={() => toggleApprover(pId)}
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {p.name || p.email}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedApprovers.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {isRespondModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Review Minutes
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Decision
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="responseStatus"
                      value="approved"
                      checked={responseStatus === "approved"}
                      onChange={(e) => setResponseStatus(e.target.value)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      Approve
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="responseStatus"
                      value="rejected"
                      checked={responseStatus === "rejected"}
                      onChange={(e) => setResponseStatus(e.target.value)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      Request Changes (Reject)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows="3"
                  placeholder="Explain any required changes..."
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsRespondModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                  responseStatus === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinutesApproval;
