import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FaMicrophone,
  FaChartBar,
  FaFolderOpen,
  FaDatabase,
  FaRobot,
  FaSearch,
} from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa6";

const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
};

const FeatureCard = ({
  icon,
  title,
  description,
  iconBg,
  glowClass,
  index,
  size = "default",
}) => {
  const ref = useReveal();
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;
  const number = String(index + 1).padStart(2, "0");

  const layout = {
    hero: {
      shell: "p-5 sm:p-6 lg:p-7 min-h-0 lg:col-span-2 lg:row-span-2",
      iconWrap: "h-14 w-14 sm:h-16 sm:w-16 text-2xl shrink-0",
      title: "text-lg sm:text-xl font-bold tracking-tight",
      body: "min-w-0 flex-1",
    },
    featured: {
      shell: "p-5 sm:p-6 min-h-0 lg:col-span-2",
      iconWrap: "h-12 w-12 text-lg shrink-0",
      title: "text-base sm:text-lg font-semibold tracking-tight",
      body: "min-w-0",
    },
    default: {
      shell: "p-5 min-h-0",
      iconWrap: "h-11 w-11 text-base shrink-0",
      title: "text-base font-semibold tracking-tight",
      body: "min-w-0",
    },
  }[size];

  return (
    <article
      ref={ref}
      className={`feature-card-shine fade-in-up ${staggerClass} group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white/90 backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-blue-200/80 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-blue-700/50 dark:hover:shadow-blue-900/20 ${layout.shell} ${
        size === "hero"
          ? "border-blue-100/80 shadow-md shadow-blue-500/5 dark:border-blue-900/30"
          : ""
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Ambient glow */}
      <div
        className={`feature-glow-orb pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${glowClass}`}
        aria-hidden="true"
      />

      {/* Hover accent line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blue-500/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      />

      <span
        className="absolute right-4 top-4 z-[2] rounded-lg border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-bold tabular-nums tracking-widest text-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        aria-hidden="true"
      >
        {number}
      </span>

      <div
        className={`relative z-[2] flex w-full flex-col gap-3 ${
          size === "hero" ? "lg:flex-row lg:items-center lg:gap-5" : ""
        }`}
      >
        <div
          className={`flex items-center justify-center rounded-xl text-white shadow-lg ring-1 ring-white/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-blue-500/25 ${iconBg} ${layout.iconWrap}`}
        >
          {icon}
        </div>

        <div
          className={`${layout.body} ${size === "hero" ? "lg:mt-0 lg:pr-8" : ""}`}
        >
          <h3 className={`text-gray-900 dark:text-gray-50 ${layout.title}`}>
            {title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>

      {/* Bottom gradient fade on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-blue-500/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-blue-400/[0.06]"
        aria-hidden="true"
      />
    </article>
  );
};

const Features = () => {
  const navigate = useNavigate();
  const headingRef = useReveal();
  const { t } = useTranslation();

  const featuresData = [
    {
      id: 1,
      icon: <FaRobot />,
      title: t("features.aiMeetingSummaries"),
      description: t("features.aiMeetingSummariesDesc"),
      iconBg: "bg-linear-to-br from-indigo-500 to-purple-500",
      glowClass: "bg-indigo-500/20",
      size: "hero",
    },
    {
      id: 2,
      icon: <FaSearch />,
      title: t("features.smartSearch"),
      description: t("features.smartSearchDesc"),
      iconBg: "bg-linear-to-br from-pink-500 to-rose-400",
      glowClass: "bg-rose-500/20",
      size: "featured",
    },
    {
      id: 3,
      icon: <FaMicrophone />,
      title: t("features.meetingRecording"),
      description: t("features.meetingRecordingDesc"),
      iconBg: "bg-linear-to-br from-blue-500 to-cyan-400",
      glowClass: "bg-cyan-500/20",
      size: "default",
    },
    {
      id: 4,
      icon: <FaChartBar />,
      title: t("features.reportsAnalytics"),
      description: t("features.reportsAnalyticsDesc"),
      iconBg: "bg-linear-to-br from-purple-500 to-pink-400",
      glowClass: "bg-purple-500/20",
      size: "default",
    },
    {
      id: 5,
      icon: <FaFolderOpen />,
      title: t("features.policyManagement"),
      description: t("features.policyManagementDesc"),
      iconBg: "bg-linear-to-br from-green-500 to-emerald-400",
      glowClass: "bg-emerald-500/20",
      size: "default",
    },
    {
      id: 6,
      icon: <FaDatabase />,
      title: t("features.institutionalMemory"),
      description: t("features.institutionalMemoryDesc"),
      iconBg: "bg-linear-to-br from-orange-500 to-amber-400",
      glowClass: "bg-amber-500/20",
      size: "featured",
    },
  ];

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-linear-to-b from-slate-50 to-white px-4 py-24 dark:from-slate-950 dark:to-slate-900"
    >
      {/* Subtle section backdrop */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="animate-blob absolute -left-32 top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />
        <div className="animate-blob animation-delay-2000 absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-600/10" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div
          ref={headingRef}
          className="fade-in-up mx-auto mb-12 max-w-2xl text-center sm:mb-14"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            {t("features.badge")}
          </span>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            {t("features.heading1")}{" "}
            <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {t("features.heading2")}
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {featuresData.map((feature, index) => (
            <FeatureCard key={feature.id} {...feature} index={index} />
          ))}
        </div>

        <div className="mt-12 text-center sm:mt-14">
          <button
            id="features-cta-btn"
            type="button"
            onClick={() => navigate("/signup")}
            className="group inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-8 py-3.5 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/30 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-100"
            aria-label="Start using MeetOnMemory for free"
          >
            {t("features.startForFree")}
            <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Features;
