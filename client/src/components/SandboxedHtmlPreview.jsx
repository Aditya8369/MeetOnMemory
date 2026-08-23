import React from "react";
import PropTypes from "prop-types";
import { sanitizeHtml } from "../utils/sanitizeHtml";

/**
 * SandboxedHtmlPreview
 * Securely renders raw HTML (such as email digests or generated previews)
 * by sanitizing first, then isolating the result in an iframe with a
 * restrictive sandbox policy. Scripts, same-origin access, top navigation,
 * and form submissions are all disallowed.
 */
const SandboxedHtmlPreview = ({
  htmlContent,
  className = "",
  title = "Digest Preview",
}) => {
  const sanitizedHtml = sanitizeHtml(htmlContent);
  if (!sanitizedHtml) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${className}`}
    >
      <iframe
        title={title}
        srcDoc={sanitizedHtml}
        className="w-full h-full min-h-[400px] border-none"
        // Maximum restriction sandbox:
        // - No 'allow-scripts': prevents JS execution
        // - No 'allow-same-origin': blocks access to parent cookies/storage
        // - No 'allow-top-navigation': prevents redirecting the parent window
        // - No 'allow-popups': prevents opening new windows
        // - No 'allow-forms': prevents form submissions
        sandbox=""
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

SandboxedHtmlPreview.propTypes = {
  htmlContent: PropTypes.string,
  className: PropTypes.string,
  title: PropTypes.string,
};

export default SandboxedHtmlPreview;
