import React, { useState, useEffect, useRef } from "react";
import { Mail, X, Send } from "lucide-react";
import { toast } from "react-toastify";

const InviteMemberForm = ({ onClose, onSendInvite }) => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteExpiresIn, setInviteExpiresIn] = useState(7);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  const modalRef = useRef(null);
  const emailInputRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  // Focus management & Escape key handling (Issue #1683)
  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement;

    // Focus first interactive element or input
    const timer = setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previouslyFocusedElementRef.current &&
        typeof previouslyFocusedElementRef.current.focus === "function"
      ) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Email is required");
      return;
    }

    try {
      setSendingInvite(true);
      await onSendInvite(
        {
          email: inviteEmail,
          role: inviteRole,
          expiresIn: Number(inviteExpiresIn),
          message: inviteMessage,
        },
        () => {
          onClose();
        },
      );
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        aria-describedby="invite-modal-description"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close invite modal"
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="invite-modal-title"
            className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <Mail className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Invite Team Member
          </h2>
          <p
            id="invite-modal-description"
            className="text-xs text-slate-500 dark:text-slate-400 mt-1"
          >
            Send an email invitation to onboard a new member to your
            organization.
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="invite-email-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Email Address *
            </label>
            <input
              id="invite-email-input"
              ref={emailInputRef}
              type="email"
              required
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="invite-role-select"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Role *
              </label>
              <select
                id="invite-role-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-expires-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Expires In (Days)
              </label>
              <input
                id="invite-expires-input"
                type="number"
                min="1"
                max="30"
                value={inviteExpiresIn}
                onChange={(e) => setInviteExpiresIn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="invite-message-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Personal Message
            </label>
            <textarea
              id="invite-message-input"
              placeholder="Hey, join our workspace on MeetOnMemory!"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows="3"
              maxLength="500"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingInvite}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-all text-sm shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {sendingInvite ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberForm;
