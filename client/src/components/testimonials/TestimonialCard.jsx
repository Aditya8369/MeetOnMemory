import React from "react";
import StarRating from "./StarRating.jsx";

const initials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function TestimonialCard({ testimonial, compact = false }) {
  const name = testimonial?.user?.name || "Anonymous";
  const profilePic = testimonial?.user?.profilePic || "";
  const orgName = testimonial?.organization?.name;
  const role = testimonial?.user?.role;
  const subtitle = [role, orgName].filter(Boolean).join(" · ");

  return (
    <article
      className={`h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm ${
        compact ? "p-5" : "p-6 sm:p-7"
      }`}
    >
      <StarRating value={testimonial?.rating || 0} readOnly size="sm" />

      <blockquote className="mt-4 flex-1">
        <p
          className={`text-gray-700 dark:text-gray-200 leading-relaxed ${
            compact
              ? "text-sm line-clamp-3"
              : "text-sm sm:text-base line-clamp-4"
          }`}
        >
          &ldquo;{testimonial?.comment || ""}&rdquo;
        </p>
      </blockquote>

      <div className="mt-5 flex items-center gap-3">
        {profilePic ? (
          <img
            src={profilePic}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center"
            aria-hidden="true"
          >
            {initials(name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {name}
          </p>
          {subtitle ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
