import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Globe, Lock, Shield, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { webhookApi } from "../services";
import { WEBHOOK_EVENTS } from "../config/webhookEvents.js";

const SECRET_MASK = "••••••••••••••••••••••••••••••••";

const WebhookModal = ({
  isOpen,
  onClose,
  webhook = null,
  organizationId,
  onSuccess,
  triggerRef,
}) => {
  const isEdit = !!webhook;
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState([
    "meeting.created",
    "mom.generated",
  ]);
  const [secret, setSecret] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (webhook) {
      setTargetUrl(webhook.targetUrl || "");
      setSelectedEvents(webhook.events || ["meeting.created"]);
      setSecret(webhook.hasSecret ? SECRET_MASK : generateRandomSecret());
      setIsActive(webhook.isActive !== false);
    } else {
      setTargetUrl("");
      setSelectedEvents(["meeting.created", "mom.generated"]);
      setSecret(generateRandomSecret());
      setIsActive(true);
    }
  }, [webhook, isOpen]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current =
        triggerRef?.current || document.activeElement;
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (previousActiveElementRef.current) {
        setTimeout(() => previousActiveElementRef.current?.focus(), 50);
      }
      return undefined;
    }

    if (!modalRef.current) return undefined;

    const modal = modalRef.current;
    const trapFocus = (event) => {
      if (event.key !== "Tab") return;

      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    setTimeout(() => focusable[0]?.focus(), 50);
    modal.addEventListener("keydown", trapFocus);

    return () => modal.removeEventListener("keydown", trapFocus);
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === backdropRef.current) onClose();
    },
    [onClose],
  );

  function generateRandomSecret() {
    const chars = "abcdef0123456789";
    let value = "";
    for (let i = 0; i < 64; i += 1) {
      value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return value;
  }

  const handleToggleEvent = (eventId) => {
    setSelectedEvents((current) =>
      current.includes(eventId)
        ? current.filter((event) => event !== eventId)
        : [...current, eventId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!targetUrl.trim()) {
      toast.error("Target URL is required.");
      return;
    }

    if (!targetUrl.startsWith("https://")) {
      toast.error("Target URL must start with https://");
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error("Please select at least one event trigger.");
      return;
    }

    setLoading(true);

    try {
      const payloadSecret = secret === SECRET_MASK ? undefined : secret.trim();

      const payload = {
        targetUrl: targetUrl.trim(),
        events: selectedEvents,
        isActive,
      };

      if (!isEdit || payloadSecret) {
        payload.secret = payloadSecret;
      }

      if (isEdit) {
        await webhookApi.updateWebhook(webhook._id, payload);
        toast.success("Webhook subscription updated successfully!");
      } else {
        await webhookApi.createWebhook({
          organizationId,
          ...payload,
        });
        toast.success("Webhook registered successfully!");
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to save webhook subscription.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhook-modal-title"
        aria-describedby="webhook-modal-description"
        onClick={(event) => event.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="webhook-modal-title"
                className="font-semibold text-slate-900 dark:text-white text-lg"
              >
                {isEdit ? "Edit Webhook Subscription" : "Register Webhook"}
              </h3>
              <p
                id="webhook-modal-description"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Receive real-time event payloads to your HTTP endpoint
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close webhook dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Target Payload URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                required
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://api.yourcompany.com/webhooks"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Event Triggers <span className="text-red-500">*</span>
            </legend>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((eventDefinition) => {
                const checked = selectedEvents.includes(eventDefinition.id);
                return (
                  <label
                    key={eventDefinition.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/60"
                        : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100/60 dark:hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleEvent(eventDefinition.id)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900 dark:text-white">
                        {eventDefinition.label}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {eventDefinition.desc}
                      </span>
                      <code className="block mt-1 text-[10px] text-slate-400 font-mono">
                        {eventDefinition.id}
                      </code>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                HMAC Secret Key
              </label>
              {!isEdit || secret !== SECRET_MASK ? (
                <button
                  type="button"
                  onClick={() => setSecret(generateRandomSecret())}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Secret is hidden for security
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder={
                  isEdit && webhook?.hasSecret
                    ? "Enter new secret to overwrite (or leave hidden)"
                    : "Secret key for signing payloads"
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                readOnly={isEdit && secret === SECRET_MASK}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Used to compute{" "}
              <code className="text-slate-700 dark:text-slate-300 font-mono">
                x-meetonmemory-signature
              </code>
            </p>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Enable Webhook Subscription
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Register Webhook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebhookModal;
