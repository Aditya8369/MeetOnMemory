import React from "react";
import { Star } from "lucide-react";

/**
 * Interactive or read-only 1–5 star rating control.
 */
export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = "md",
  label = "Rating",
}) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  const stars = [1, 2, 3, 4, 5];

  if (readOnly) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${value} out of 5 stars`}
      >
        {stars.map((star) => (
          <Star
            key={star}
            aria-hidden="true"
            className={`${sizeClass} ${
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-slate-300 dark:text-slate-600"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1"
      role="radiogroup"
      aria-label={label}
    >
      {stars.map((star) => {
        const selected = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange?.(star)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange?.(Math.min(5, value + 1 || 1));
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange?.(Math.max(1, (value || 1) - 1));
              }
            }}
            className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
          >
            <Star
              aria-hidden="true"
              className={`${sizeClass} transition-colors ${
                selected
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-slate-300 dark:text-slate-600 hover:text-amber-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
