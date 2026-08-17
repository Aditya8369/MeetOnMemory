import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { Github, Mail, Activity, Star } from "lucide-react";
import BrandLogo from "./branding/BrandLogo.jsx";

const SUPPORT_EMAIL = "meetonmemory@gmail.com";
const GITHUB_REPO_URL = "https://github.com/imuniqueshiv/MeetOnMemory";

const footerLinkClass =
  "text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

const footerHeadingClass =
  "text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800";

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  const handleNavLink = (href) => {
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isLandingPage) {
    return (
      <footer
        role="contentinfo"
        className="mt-auto border-t border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start md:gap-4">
              <Link to="/" className="group flex items-center gap-2">
                <BrandLogo
                  variant="mark"
                  alt=""
                  aria-hidden="true"
                  className="h-6 w-6 transition-transform duration-300 group-hover:scale-105"
                />
                <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  MeetOn
                  <span className="text-blue-600 dark:text-blue-400">
                    Memory
                  </span>
                </span>
              </Link>
              <span className="hidden text-gray-300 dark:text-gray-600 sm:inline">
                |
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                &copy; {currentYear} MeetOnMemory.{" "}
                {t("footer.allRightsReserved")}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                v1.0.0
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Link to="/privacy" className={footerLinkClass}>
                {t("footer.privacy")}
              </Link>
              <Link to="/terms" className={footerLinkClass}>
                {t("footer.terms")}
              </Link>
              <Link to="/security" className={footerLinkClass}>
                {t("footer.security", "Security")}
              </Link>
              <Link to="/cookie-policy" className={footerLinkClass}>
                Cookies
              </Link>
              <Link to="/help-center" className={footerLinkClass}>
                {t("footer.helpCenter", "Help Center")}
              </Link>
              <Link to="/careers" className={footerLinkClass}>
                {t("footer.careers", "Careers")}
              </Link>
              <Link
                to="/docs"
                className={`${footerLinkClass} font-semibold text-blue-600 dark:text-blue-400`}
              >
                Developer Docs
              </Link>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <Link to="/contact" className={footerLinkClass}>
                {t("footer.contact", "Contact")}
              </Link>
              <Link to="/status" className={footerLinkClass}>
                {t("footer.status", "Status")}
              </Link>
              <a
                href="https://github.com/imuniqueshiv/MeetOnMemory"
                target="_blank"
                rel="noopener noreferrer"
                className={`${footerLinkClass} flex items-center gap-1`}
              >
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const socialLinks = [
    {
      href: GITHUB_REPO_URL,
      label: "MeetOnMemory GitHub repository",
      icon: Github,
    },
    {
      href: "/contact",
      label: t("footer.contact", "Contact"),
      icon: Mail,
      isInternal: true,
    },
    {
      href: "/status",
      label: t("footer.status", "System Status"),
      icon: Activity,
      isInternal: true,
    },
  ];

  return (
    <footer
      role="contentinfo"
      className="mt-auto border-t border-gray-200 bg-white pt-14 pb-8 dark:border-gray-800 dark:bg-gray-900 sm:pt-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 lg:mb-14 lg:grid-cols-12 lg:gap-12">
          {/* Brand */}
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <BrandLogo
                variant="mark"
                alt=""
                aria-hidden="true"
                className="h-10 w-10"
              />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                MeetOn
                <span className="text-blue-600 dark:text-blue-400">Memory</span>
              </span>
            </div>
            <p className="text-sm font-medium leading-snug text-gray-600 dark:text-gray-300">
              {t("hero.badge")}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-gray-400 dark:text-gray-500">
              {t("footer.description")}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {socialLinks.map(({ href, label, icon: Icon, isInternal }) =>
                isInternal ? (
                  <Link
                    key={href}
                    to={href}
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 dark:focus-visible:ring-offset-gray-900"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (opens in new tab)`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 dark:focus-visible:ring-offset-gray-900"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ),
              )}
            </div>
          </div>

          {/* Product */}
          <nav
            className="lg:col-span-2"
            aria-label={t("footer.product", "Product")}
          >
            <h3 className={footerHeadingClass}>{t("footer.product")}</h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link to="/" className={footerLinkClass}>
                  Home
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavLink("#features")}
                  className={`${footerLinkClass} text-left`}
                  aria-label="Scroll to Features section"
                >
                  {t("navbar.features")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavLink("#how-it-works")}
                  className={`${footerLinkClass} text-left`}
                  aria-label="Scroll to How It Works section"
                >
                  {t("navbar.howItWorks")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavLink("#about")}
                  className={`${footerLinkClass} text-left`}
                  aria-label="Scroll to About section"
                >
                  {t("navbar.about")}
                </button>
              </li>
              <li>
                <Link to="/dashboard" className={footerLinkClass}>
                  {t("navbar.dashboard")}
                </Link>
              </li>
              <li>
                <Link to="/login" className={footerLinkClass}>
                  {t("navbar.login")}
                </Link>
              </li>
              <li>
                <Link to="/status" className={footerLinkClass}>
                  {t("footer.status", "System Status")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Company */}
          <nav
            className="lg:col-span-3"
            aria-label={t("footer.company", "Company")}
          >
            <h3 className={footerHeadingClass}>{t("footer.company")}</h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link to="/help-center" className={footerLinkClass}>
                  {t("footer.helpCenter", "Help Center")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className={footerLinkClass}>
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/careers" className={footerLinkClass}>
                  {t("footer.careers", "Careers")}
                </Link>
              </li>
              <li>
                <Link
                  to="/docs"
                  className={`${footerLinkClass} font-semibold text-blue-600 dark:text-blue-400`}
                >
                  Developer Docs
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/imuniqueshiv/MeetOnMemory"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="MeetOnMemory GitHub repository (opens in new tab)"
                  className={footerLinkClass}
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/imuniqueshiv/MeetOnMemory/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Report issues on GitHub (opens in new tab)"
                  className={footerLinkClass}
                >
                  Report Issues
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/imuniqueshiv/MeetOnMemory/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contributing guide (opens in new tab)"
                  className={footerLinkClass}
                >
                  Contributing
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/imuniqueshiv/MeetOnMemory/blob/main/CODE_OF_CONDUCT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Code of Conduct (opens in new tab)"
                  className={footerLinkClass}
                >
                  Code of Conduct
                </a>
              </li>
            </ul>
          </nav>

          {/* Contact / Connect */}
          <div className="lg:col-span-3">
            <h3 className={footerHeadingClass}>
              {t("footer.getInTouch", "Get in Touch")}
            </h3>
            <ul className="mb-6 flex flex-col gap-2.5">
              <li>
                <Link
                  to="/contact"
                  className={`${footerLinkClass} font-medium`}
                >
                  {t("footer.contact", "Contact Us")}
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={`${footerLinkClass} inline-flex items-center gap-2`}
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t("footer.meetOnMemoryTeam")} on GitHub (opens in new tab)`}
                  className={`${footerLinkClass} inline-flex items-center gap-2`}
                >
                  <Github className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("footer.meetOnMemoryTeam")}
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.starRepo", "Star the repo if you like")}
                  className={`${footerLinkClass} inline-flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400`}
                >
                  <Star className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("footer.starRepo", "Star the repo if you like")}
                </a>
              </li>
            </ul>

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Built with
            </p>
            <ul className="flex flex-col gap-2">
              {[
                "React",
                "Node.js",
                "Express",
                "MongoDB",
                "Google Gemini",
                "Pinecone",
              ].map((tech) => (
                <li
                  key={tech}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-linear-to-br from-blue-600 to-violet-600"
                    aria-hidden="true"
                  />
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 dark:border-gray-800 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              &copy; {currentYear} MeetOnMemory. {t("footer.allRightsReserved")}
            </p>
            <div className="hidden h-4 w-px bg-gray-200 dark:bg-gray-700 sm:block" />
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium text-gray-400 dark:text-gray-500">
              <Link to="/privacy" className={footerLinkClass}>
                {t("footer.privacy")}
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/terms" className={footerLinkClass}>
                {t("footer.terms")}
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/security" className={footerLinkClass}>
                {t("footer.security", "Security")}
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/cookie-policy" className={footerLinkClass}>
                Cookies
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/help-center" className={footerLinkClass}>
                {t("footer.helpCenter", "Help Center")}
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/careers" className={footerLinkClass}>
                {t("footer.careers", "Careers")}
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/contact" className={footerLinkClass}>
                {t("footer.contact", "Contact")}
              </Link>
              <span aria-hidden="true">•</span>
              <Link to="/status" className={footerLinkClass}>
                {t("footer.status", "Status")}
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 dark:text-gray-500 sm:text-right">
            {t("footer.madeWith")} ❤️ {t("footer.by")}{" "}
            {t("footer.meetOnMemoryTeam")}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
