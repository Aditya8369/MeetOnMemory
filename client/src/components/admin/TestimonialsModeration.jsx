import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import apiClient from "../../services/apiClient.js";
import StarRating from "../testimonials/StarRating.jsx";

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"];

export default function TestimonialsModeration() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { page: 1, limit: 50 };
      if (status !== "all") params.status = status;
      const { data } = await apiClient.get("/api/admin/testimonials", {
        params,
      });
      setItems(data.testimonials || []);
    } catch {
      setError("Unable to load testimonials for moderation.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, nextStatus) => {
    setBusyId(id);
    try {
      await apiClient.patch(`/api/admin/testimonials/${id}/status`, {
        status: nextStatus,
      });
      toast.success(`Marked as ${nextStatus}`);
      await load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update moderation status",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this testimonial permanently?")) return;
    setBusyId(id);
    try {
      await apiClient.delete(`/api/admin/testimonials/${id}`);
      toast.success("Testimonial removed");
      await load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to remove testimonial",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by status"
      >
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize cursor-pointer ${
              status === value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
          No testimonials in this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating value={item.rating} readOnly size="sm" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.user?.name || "Unknown user"}
                    {item.organization?.name
                      ? ` · ${item.organization.name}`
                      : ""}
                    {item.createdAt
                      ? ` · ${new Date(item.createdAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.status !== "approved" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "approved")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
                    >
                      Approve
                    </button>
                  ) : null}
                  {item.status !== "rejected" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "rejected")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white disabled:opacity-50 cursor-pointer"
                    >
                      Reject
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => remove(item.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white disabled:opacity-50 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
