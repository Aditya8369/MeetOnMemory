import React, { useState, useEffect, useContext, useCallback } from "react";
import { format } from "date-fns";
import AppContent from "../context/AppContent";
import Navbar from "../components/Navbar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { recapScheduleApi } from "../services/recapScheduleApi";
import {
  Clock,
  Mail,
  CheckCircle2,
  RefreshCw,
  Save,
  AlertCircle,
  Calendar,
  Play,
  Webhook,
  Bell,
  XCircle,
} from "lucide-react";

const RETRY_FEEDBACK_TIMEOUT = 3000;
const CHANNELS = [
  {
    id: "email",
    label: "Email",
    hint: "Send recap emails to members with an address on file.",
    Icon: Mail,
  },
  {
    id: "in_app",
    label: "In-app",
    hint: "Show recaps inside MeetOnMemory notifications.",
    Icon: Bell,
  },
  {
    id: "webhook",
    label: "Webhook",
    hint: "POST recap payloads to a public HTTPS endpoint.",
    Icon: Webhook,
  },
];

const RecapScheduleDashboard = () => {
  const { userData } = useContext(AppContent);
  const organizationId = userData?.organization?._id || userData?.organization;
  const [schedule, setSchedule] = useState({
    scheduleType: "immediate",
    deliveryChannel: "email",
    webhookUrl: "",
    preferredTime: "09:00",
    timezone: "UTC",
    startDate: "",
    endDate: "",
  });
  const [history, setHistory] = useState([]);
  const [failedDeliveries, setFailedDeliveries] = useState([]);
  const [dryRun, setDryRun] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState(null);
  const [retryTarget, setRetryTarget] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });
  const [retryMessage, setRetryMessage] = useState({ type: "", text: "" });

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [scheduleRes, historyRes, failedRes] = await Promise.allSettled([
        recapScheduleApi.getSchedule(organizationId),
        recapScheduleApi.getDeliveryHistory(),
        recapScheduleApi.getFailedDeliveries(),
      ]);
      if (scheduleRes.status === "fulfilled" && scheduleRes.value.data) {
        const data = scheduleRes.value.data;
        setSchedule({
          scheduleType: data.scheduleType || "immediate",
          deliveryChannel: data.deliveryChannel || "email",
          webhookUrl: data.webhookUrl || "",
          preferredTime: data.preferredTime || "09:00",
          timezone: data.timezone || "UTC",
          startDate: data.startDate
            ? new Date(data.startDate).toISOString().slice(0, 10)
            : "",
          endDate: data.endDate
            ? new Date(data.endDate).toISOString().slice(0, 10)
            : "",
        });
      }
      if (historyRes.status === "fulfilled" && historyRes.value.data) {
        setHistory(historyRes.value.data);
      }
      if (failedRes.status === "fulfilled" && failedRes.value.data) {
        setFailedDeliveries(failedRes.value.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSchedule((prev) => ({ ...prev, [name]: value }));
    if (saveMessage.type === "error") setSaveMessage({ type: "", text: "" });
  };

  const selectChannel = (channelId) => {
    setSchedule((prev) => ({ ...prev, deliveryChannel: channelId }));
    if (saveMessage.type === "error") setSaveMessage({ type: "", text: "" });
  };

  const validateSchedule = () => {
    if (!schedule.timezone || !schedule.timezone.trim())
      return "Timezone cannot be empty.";
    if (!["email", "webhook", "in_app"].includes(schedule.deliveryChannel)) {
      return "Select a valid delivery channel (email, webhook, or in-app).";
    }
    if (schedule.deliveryChannel === "webhook") {
      const url = (schedule.webhookUrl || "").trim();
      if (!url) return "Webhook URL is required for webhook delivery.";
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return "Webhook URL must use http or https.";
        }
      } catch {
        return "Webhook URL is invalid.";
      }
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (schedule.startDate && schedule.startDate < todayStr)
      return "Start date cannot be in the past.";
    if (
      schedule.startDate &&
      schedule.endDate &&
      schedule.endDate < schedule.startDate
    )
      return "End date must be on or after start date.";
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validateSchedule();
    if (validationError) {
      setSaveMessage({ type: "error", text: validationError });
      return;
    }
    setIsSaving(true);
    setSaveMessage({ type: "", text: "" });
    try {
      await recapScheduleApi.upsertSchedule(organizationId, {
        scheduleType: schedule.scheduleType,
        deliveryChannel: schedule.deliveryChannel,
        webhookUrl:
          schedule.deliveryChannel === "webhook" ? schedule.webhookUrl : "",
        preferredTime: schedule.preferredTime,
        timezone: schedule.timezone,
      });
      setSaveMessage({
        type: "success",
        text: "Schedule updated successfully!",
      });
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Save error:", error);
      const apiError = error?.response?.data?.error;
      const message =
        typeof apiError === "string"
          ? apiError
          : "Failed to update schedule. Check channel settings and try again.";
      setSaveMessage({ type: "error", text: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDryRun = async () => {
    setIsDryRunning(true);
    setDryRun(null);
    try {
      const { data } = await recapScheduleApi.dryRun(organizationId, {
        deliveryChannel: schedule.deliveryChannel,
        webhookUrl: schedule.webhookUrl,
      });
      setDryRun(data);
    } catch (error) {
      setDryRun({
        warnings: [
          error?.response?.data?.error ||
            "Dry-run failed. Save your schedule and try again.",
        ],
        recipients: [],
        recipientCount: 0,
        channel: schedule.deliveryChannel,
      });
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleRetryConfirm = async () => {
    if (!retryTarget) return;
    const deliveryId = retryTarget._id;
    setRetryingDeliveryId(deliveryId);
    setRetryLoading(true);
    setRetryMessage({ type: "", text: "" });
    try {
      await recapScheduleApi.retryDelivery(deliveryId);
      setRetryTarget(null);
      setRetryMessage({
        type: "success",
        text: "Retry enqueued successfully.",
      });
      setTimeout(
        () => setRetryMessage({ type: "", text: "" }),
        RETRY_FEEDBACK_TIMEOUT,
      );
      await fetchData();
    } catch (error) {
      console.error("Retry failed:", error);
      setRetryMessage({
        type: "error",
        text:
          error?.response?.data?.error ||
          "We couldn't enqueue the retry. Please try again.",
      });
    } finally {
      setRetryingDeliveryId(null);
      setRetryLoading(false);
    }
  };

  const statusBadge = (delivery) => {
    const status = delivery.status || "delivered";
    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400">
          <RefreshCw className="w-3 h-3" /> Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/20">
        <CheckCircle2 className="w-3 h-3" /> Delivered
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-28 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Recap Scheduling & Delivery
          </h1>
          <p className="mt-2 text-slate-600 dark:text-gray-400">
            Configure channels, dry-run recipients, and triage failed
            deliveries.
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : !organizationId ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 shadow rounded-xl border border-slate-200 dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
              <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              No Organization Found
            </h2>
            <p className="text-slate-600 dark:text-gray-400 text-center max-w-md mb-6">
              You need to be part of an organization to manage recap delivery
              schedules.
            </p>
            <a
              href="/organizations"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Join or Create an Organization
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 border border-slate-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Schedule Settings
                </h2>
                <form noValidate onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Delivery Frequency
                    </label>
                    <select
                      name="scheduleType"
                      value={schedule.scheduleType}
                      onChange={handleChange}
                      className="w-full rounded-lg border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Delivery Channel
                    </legend>
                    <div className="space-y-2">
                      {CHANNELS.map(({ id, label, hint, Icon }) => {
                        const selected = schedule.deliveryChannel === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => selectChannel(id)}
                            className={`w-full text-left rounded-lg border px-3 py-2.5 transition cursor-pointer ${
                              selected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-slate-200 dark:border-gray-600 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                              <Icon className="w-4 h-4 text-blue-600" />
                              {label}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                              {hint}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  {schedule.deliveryChannel === "webhook" && (
                    <div>
                      <label
                        htmlFor="webhook-url"
                        className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
                      >
                        Webhook URL
                      </label>
                      <input
                        id="webhook-url"
                        type="url"
                        name="webhookUrl"
                        value={schedule.webhookUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/hooks/recap"
                        className="w-full rounded-lg border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}

                  {schedule.scheduleType !== "immediate" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                        Preferred Time
                      </label>
                      <input
                        type="time"
                        name="preferredTime"
                        value={schedule.preferredTime}
                        onChange={handleChange}
                        className="w-full rounded-lg border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Timezone
                    </label>
                    <input
                      type="text"
                      name="timezone"
                      value={schedule.timezone}
                      onChange={handleChange}
                      placeholder="e.g., UTC, America/New_York"
                      className="w-full rounded-lg border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="schedule-start-date"
                        className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1 flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Start Date
                      </label>
                      <input
                        id="schedule-start-date"
                        type="date"
                        name="startDate"
                        value={schedule.startDate}
                        onChange={handleChange}
                        className="w-full rounded-lg border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="schedule-end-date"
                        className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1 flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" /> End Date
                      </label>
                      <input
                        id="schedule-end-date"
                        type="date"
                        name="endDate"
                        value={schedule.endDate}
                        onChange={handleChange}
                        className="w-full rounded-lg border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? "Saving..." : "Save Preferences"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDryRun}
                    disabled={isDryRunning}
                    className="w-full flex justify-center items-center gap-2 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-70 cursor-pointer"
                  >
                    {isDryRunning ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isDryRunning ? "Running dry-run…" : "Dry-run preview"}
                  </button>
                  {saveMessage.text && (
                    <div
                      role="alert"
                      className={`p-3 rounded-md flex items-center gap-2 text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                    >
                      {saveMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {saveMessage.text}
                    </div>
                  )}
                </form>
              </div>

              {dryRun && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-5 border border-slate-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Dry-run · {dryRun.channel || schedule.deliveryChannel}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">
                    {dryRun.recipientCount ?? 0} recipient(s) would receive a
                    recap.
                  </p>
                  {(dryRun.warnings || []).map((warning) => (
                    <p
                      key={warning}
                      className="text-xs text-amber-700 dark:text-amber-400 mb-2 flex gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {warning}
                    </p>
                  ))}
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {(dryRun.recipients || []).map((r) => (
                      <li
                        key={String(r.userId)}
                        className="text-xs border border-slate-100 dark:border-gray-700 rounded-lg px-3 py-2"
                      >
                        <p className="font-semibold text-slate-800 dark:text-gray-100">
                          {r.name}
                        </p>
                        <p
                          className={
                            r.wouldReceive
                              ? "text-slate-500 dark:text-gray-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {r.detail}
                        </p>
                      </li>
                    ))}
                    {(dryRun.recipients || []).length === 0 && (
                      <li className="text-xs text-slate-400">
                        No recipients to preview.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-xl border border-slate-200 dark:border-gray-700 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    Failed delivery triage
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    Review error details and retry failed deliveries.
                  </p>
                </div>
                <div className="p-0 overflow-x-auto">
                  {retryMessage.text && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className={`m-4 p-3 rounded-md flex items-center gap-2 text-sm ${retryMessage.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                    >
                      {retryMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{retryMessage.text}</span>
                    </div>
                  )}
                  {failedDeliveries.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-gray-400">
                      No failed deliveries. You&apos;re clear.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-200 dark:divide-gray-700">
                      {failedDeliveries.map((delivery) => (
                        <li
                          key={delivery._id}
                          className="px-6 py-4 flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {delivery.meetingId?.title || "Unknown Meeting"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {delivery.channel || "email"} ·{" "}
                              {delivery.updatedAt || delivery.deliveredAt
                                ? format(
                                    new Date(
                                      delivery.updatedAt ||
                                        delivery.deliveredAt,
                                    ),
                                    "MMM d, yyyy h:mm a",
                                  )
                                : "—"}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2 break-words">
                              {delivery.errorMessage ||
                                "Delivery failed without a detailed error. Retry or check mail/webhook configuration."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setRetryTarget({
                                _id: delivery._id,
                                meetingTitle:
                                  delivery.meetingId?.title ||
                                  "Unknown Meeting",
                              })
                            }
                            disabled={retryingDeliveryId === delivery._id}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer disabled:opacity-60"
                          >
                            {retryingDeliveryId === delivery._id
                              ? "Retrying..."
                              : "Retry"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-xl border border-slate-200 dark:border-gray-700 flex flex-col h-full">
                <div className="p-6 border-b border-slate-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    Delivery History
                  </h2>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-900/50 text-slate-500 dark:text-gray-400 text-sm">
                        <th className="px-6 py-3 font-medium">Meeting</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-700 text-sm">
                      {history.length > 0 ? (
                        history.map((delivery) => (
                          <tr
                            key={delivery._id}
                            className="hover:bg-slate-50 dark:hover:bg-gray-750"
                          >
                            <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                              {delivery.meetingId?.title || "Unknown Meeting"}
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-gray-400">
                              {format(
                                new Date(delivery.deliveredAt),
                                "MMM d, yyyy h:mm a",
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {statusBadge(delivery)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setRetryTarget({
                                    _id: delivery._id,
                                    meetingTitle:
                                      delivery.meetingId?.title ||
                                      "Unknown Meeting",
                                  })
                                }
                                disabled={retryingDeliveryId === delivery._id}
                                aria-label={`Retry delivery for ${delivery.meetingId?.title || "Unknown Meeting"}`}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                              >
                                {retryingDeliveryId === delivery._id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <RefreshCw
                                      className="w-3.5 h-3.5 animate-spin"
                                      aria-hidden="true"
                                    />
                                    Retrying...
                                  </span>
                                ) : (
                                  "Retry"
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-8 text-center text-slate-500 dark:text-gray-400"
                          >
                            No delivery history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(retryTarget)}
        onClose={() => setRetryTarget(null)}
        onConfirm={handleRetryConfirm}
        title="Retry Recap Delivery"
        message={`Are you sure you want to retry the recap delivery for "${retryTarget?.meetingTitle || "this meeting"}"?`}
        confirmText="Retry Delivery"
        variant="primary"
        isLoading={retryLoading}
      />
    </div>
  );
};

export default RecapScheduleDashboard;
