import React, { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar.jsx";
import StarRating from "../components/testimonials/StarRating.jsx";
import TestimonialCard from "../components/testimonials/TestimonialCard.jsx";
import apiClient from "../services/apiClient.js";
import AppContent from "../context/AppContent.js";

const COMMENT_MIN = 10;
const COMMENT_MAX = 500;

export default function Testimonials() {
  const navigate = useNavigate();
  const { isLoggedin } = useContext(AppContent) || {};

  const [stats, setStats] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadPublic = useCallback(async () => {
    const [statsRes, listRes] = await Promise.all([
      apiClient.get("/api/testimonials/stats"),
      apiClient.get("/api/testimonials", { params: { page: 1, limit: 24 } }),
    ]);
    setStats(statsRes.data.stats || null);
    setTestimonials(listRes.data.testimonials || []);
  }, []);

  const loadMine = useCallback(async () => {
    if (!isLoggedin) {
      setMine(null);
      return;
    }
    try {
      const { data } = await apiClient.get("/api/testimonials/me");
      setMine(data.testimonial || null);
      if (data.testimonial) {
        setRating(data.testimonial.rating);
        setComment(data.testimonial.comment);
      }
    } catch {
      setMine(null);
    }
  }, [isLoggedin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setListError(null);
        await loadPublic();
        if (!cancelled) await loadMine();
      } catch {
        if (!cancelled) {
          setListError("Unable to load testimonials right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPublic, loadMine]);

  const validate = () => {
    const trimmed = comment.trim();
    if (!rating || rating < 1 || rating > 5) {
      return "Please select a rating between 1 and 5 stars.";
    }
    if (trimmed.length < COMMENT_MIN) {
      return `Comment must be at least ${COMMENT_MIN} characters.`;
    }
    if (trimmed.length > COMMENT_MAX) {
      return `Comment must be at most ${COMMENT_MAX} characters.`;
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedin) {
      navigate("/login");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const payload = { rating, comment: comment.trim() };
      let response;
      if (mine?.id && editing) {
        response = await apiClient.put(`/api/testimonials/${mine.id}`, payload);
      } else if (!mine) {
        response = await apiClient.post("/api/testimonials", payload);
      } else {
        setEditing(true);
        setSubmitting(false);
        return;
      }

      setMine(response.data.testimonial);
      setEditing(false);
      toast.success(
        response.data.message ||
          "Your review has been submitted and is awaiting approval.",
      );
      await loadPublic();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to save your review. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = () => {
    if (!mine) return;
    setRating(mine.rating);
    setComment(mine.comment);
    setEditing(true);
    setFormError("");
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Community feedback
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Testimonials
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            See what others are saying, and share your own experience with
            MeetOnMemory.
          </p>
        </div>

        {loading ? (
          <div
            className="space-y-4"
            aria-busy="true"
            aria-label="Loading testimonials"
          >
            <div className="h-28 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-40 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ) : listError ? (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-6 py-8 text-center text-sm text-rose-700 dark:text-rose-300">
            {listError}
          </div>
        ) : (
          <>
            <section
              className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 sm:p-8 mb-8"
              aria-labelledby="rating-overview"
            >
              <h2
                id="rating-overview"
                className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                Rating overview
              </h2>
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="text-center sm:text-left">
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {stats?.averageRating?.toFixed?.(1) ?? "0.0"}
                    <span className="text-lg font-semibold text-gray-500">
                      {" "}
                      / 5
                    </span>
                  </p>
                  <div className="mt-2 flex justify-center sm:justify-start">
                    <StarRating
                      value={Math.round(stats?.averageRating || 0)}
                      readOnly
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Based on {stats?.total || 0} review
                    {(stats?.total || 0) === 1 ? "" : "s"}
                  </p>
                </div>

                <div
                  className="flex-1 space-y-2"
                  aria-label="Rating distribution"
                >
                  {(stats?.distribution || []).map((row) => (
                    <div key={row.stars} className="flex items-center gap-3">
                      <span className="w-12 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {row.stars}★
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500">
                        {row.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section
              className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 sm:p-8 mb-10"
              aria-labelledby="your-review"
            >
              <h2
                id="your-review"
                className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                {mine && !editing ? "Your review" : "Share your experience"}
              </h2>

              {!isLoggedin ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Please{" "}
                  <Link
                    to="/login"
                    className="text-blue-600 dark:text-blue-400 font-semibold underline-offset-2 hover:underline"
                  >
                    sign in
                  </Link>{" "}
                  to submit a rating.
                </p>
              ) : mine && !editing ? (
                <div className="space-y-4">
                  <StarRating value={mine.rating} readOnly />
                  <p className="text-gray-700 dark:text-gray-200">
                    &ldquo;{mine.comment}&rdquo;
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    Status: {mine.status}
                  </p>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    Edit Review
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rating
                    </label>
                    <StarRating value={rating} onChange={setRating} />
                  </div>

                  <div>
                    <label
                      htmlFor="testimonial-comment"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Comment
                    </label>
                    <textarea
                      id="testimonial-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={COMMENT_MAX}
                      className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Share what stood out about MeetOnMemory (1–3 short lines)."
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {comment.trim().length}/{COMMENT_MAX} characters
                    </p>
                  </div>

                  {formError ? (
                    <p
                      className="text-sm text-rose-600 dark:text-rose-400"
                      role="alert"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                    >
                      {submitting
                        ? "Saving…"
                        : mine
                          ? "Update review"
                          : "Submit review"}
                    </button>
                    {editing ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setRating(mine.rating);
                          setComment(mine.comment);
                          setFormError("");
                        }}
                        className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </section>

            <section aria-labelledby="all-testimonials">
              <h2
                id="all-testimonials"
                className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                Community testimonials
              </h2>
              {testimonials.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-gray-700 px-6 py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-300 font-medium">
                    No testimonials yet.
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Be the first to share your experience.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testimonials.map((item) => (
                    <TestimonialCard key={item.id} testimonial={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
