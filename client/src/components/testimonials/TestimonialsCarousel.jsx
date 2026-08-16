import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import TestimonialCard from "./TestimonialCard.jsx";

const AUTO_INTERVAL_MS = 5500;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function useVisibleCards() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1024) setCount(3);
      else if (window.innerWidth >= 768) setCount(2);
      else setCount(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return count;
}

export default function TestimonialsCarousel({ testimonials = [] }) {
  const reducedMotion = usePrefersReducedMotion();
  const visibleCount = useVisibleCards();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const sectionVisible = useRef(true);
  const tabVisible = useRef(true);
  const touchStartX = useRef(null);
  const containerRef = useRef(null);

  const total = testimonials.length;
  const maxIndex = Math.max(0, total - visibleCount);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        sectionVisible.current = entry.isIntersecting;
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      tabVisible.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (reducedMotion || !playing || userPaused || total <= visibleCount) {
      return undefined;
    }

    const timer = setInterval(() => {
      if (!sectionVisible.current || !tabVisible.current) return;
      goNext();
    }, AUTO_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [reducedMotion, playing, userPaused, total, visibleCount, goNext]);

  const pauseForInteraction = () => {
    setUserPaused(true);
    setPlaying(false);
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    pauseForInteraction();
    if (dx < 0) goNext();
    else goPrev();
  };

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-gray-700 px-6 py-12 text-center">
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          No testimonials yet.
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Be the first to share your experience.
        </p>
      </div>
    );
  }

  const pageCount = maxIndex + 1;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setUserPaused(true)}
        onMouseLeave={() => {
          if (playing) setUserPaused(false);
        }}
      >
        <div
          className={`flex gap-4 ${
            reducedMotion ? "" : "transition-transform duration-500 ease-out"
          }`}
          style={{
            transform: `translateX(-${(index * 100) / visibleCount}%)`,
          }}
        >
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="shrink-0"
              style={{
                width: `calc((100% - ${(visibleCount - 1) * 1}rem) / ${visibleCount})`,
              }}
            >
              <TestimonialCard testimonial={item} compact />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            pauseForInteraction();
            goPrev();
          }}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          aria-label="Previous testimonials"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !playing;
            setPlaying(next);
            setUserPaused(!next);
          }}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          aria-label={playing ? "Pause carousel" : "Play carousel"}
        >
          {playing ? (
            <Pause className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Play className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            pauseForInteraction();
            goNext();
          }}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          aria-label="Next testimonials"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>

        <div
          className="flex items-center gap-2 ml-2"
          role="tablist"
          aria-label="Testimonial pages"
        >
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to page ${i + 1}`}
              onClick={() => {
                pauseForInteraction();
                setIndex(i);
              }}
              className={`h-2.5 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 ${
                i === index
                  ? "w-6 bg-blue-600"
                  : "w-2.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
