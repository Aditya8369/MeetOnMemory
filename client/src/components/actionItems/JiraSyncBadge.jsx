import React from "react";

const JiraSyncBadge = ({ issueId, issueUrl }) => {
  if (!issueId || !issueUrl) return null;

  return (
    <a
      href={issueUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 mt-2 ml-2 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 rounded-md transition-colors border border-blue-200 dark:border-blue-800/50"
      title="View on Jira"
    >
      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
        {/* Simple Jira-like icon */}
        <path d="M11.53 2c0 0-4.06 4.06-6.1 6.1s-4.06 6.1-4.06 6.1l6.1 6.1s4.06-4.06 6.1-6.1 4.06-6.1 4.06-6.1l-6.1-6.1z" />
        <path d="M21.53 12c0 0-4.06 4.06-6.1 6.1s-4.06 6.1-4.06 6.1l6.1 6.1s4.06-4.06 6.1-6.1 4.06-6.1 4.06-6.1l-6.1-6.1z" />
      </svg>
      Jira {issueId}
    </a>
  );
};

export default JiraSyncBadge;
