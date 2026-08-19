import React from "react";

const SummarySection = ({ title, icon, children, className = "" }) => {
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return null;
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4 ${className}`}
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="text-gray-700 dark:text-gray-300 text-sm">{children}</div>
    </div>
  );
};

export default SummarySection;
