import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQItem = ({ faq, index, isOpen, onClick }) => {
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
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stagger = `stagger-${Math.min((index % 6) + 1, 6)}`;

  return (
    <div
      ref={ref}
      className={`fade-in-up ${stagger} overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOpen
          ? "border-blue-200 bg-white shadow-md shadow-blue-500/10 ring-1 ring-blue-100 dark:border-blue-600 dark:bg-gray-800 dark:ring-blue-900/40"
          : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
      }`}
    >
      <h3 className="m-0">
        <button
          type="button"
          className="flex w-full items-start gap-4 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6 sm:py-5"
          onClick={onClick}
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${index}`}
          id={`faq-btn-${index}`}
        >
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors duration-300 sm:h-8 sm:w-8 sm:text-sm ${
              isOpen
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            }`}
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          <span className="min-w-0 flex-1 pr-2">
            <span
              className={`block text-base font-bold leading-snug sm:text-lg ${
                isOpen
                  ? "text-gray-900 dark:text-gray-50"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {faq.question}
            </span>
          </span>

          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
              isOpen
                ? "border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30"
                : "border-slate-200 bg-slate-50 dark:border-gray-600 dark:bg-gray-700/50"
            }`}
            aria-hidden="true"
          >
            <ChevronDown
              className={`h-4 w-4 text-blue-600 transition-transform duration-300 dark:text-blue-400 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>
      </h3>

      <div
        id={`faq-answer-${index}`}
        role="region"
        aria-labelledby={`faq-btn-${index}`}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-gray-700 sm:px-6 sm:pb-6 sm:pl-[4.5rem]">
            <p className="text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base sm:leading-7">
              {faq.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(-1);
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const { t } = useTranslation();

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
    { question: t("faq.q5"), answer: t("faq.a5") },
    { question: t("faq.q6"), answer: t("faq.a6") },
    { question: t("faq.q7"), answer: t("faq.a7") },
    { question: t("faq.q8"), answer: t("faq.a8") },
  ];

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-linear-to-b from-white via-slate-50 to-white px-4 py-24 sm:px-6 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      <div className="mx-auto max-w-3xl">
        <div ref={headingRef} className="fade-in-up mb-12 text-center sm:mb-14">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            {t("faq.badge")}
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            {t("faq.heading")}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 dark:text-gray-400">
            {t("faq.subtitle")}
          </p>
        </div>

        <div
          className="space-y-3 sm:space-y-4"
          role="list"
          aria-label={t("faq.heading")}
        >
          {faqs.map((faq, index) => (
            <div key={faq.question} role="listitem">
              <FAQItem
                faq={faq}
                index={index}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 to-violet-50 p-8 text-center dark:border-blue-800 dark:from-blue-900/20 dark:to-violet-900/20">
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("faq.stillHaveQuestions")}
          </h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {t("faq.trySelf")}
          </p>
          <button
            id="faq-cta-btn"
            type="button"
            onClick={() => navigate("/signup")}
            className="group inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-8 py-3.5 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-100"
            aria-label="Get started with MeetOnMemory for free"
          >
            {t("faq.getStartedFree")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
