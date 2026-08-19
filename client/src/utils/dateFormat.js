// Shared date-format preference options + formatter.
// Import DATE_FORMATS wherever you render a Settings-style dropdown, and
// formatDateWithPreference() wherever you render a date to the user.

export const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

export const DEFAULT_DATE_FORMAT = "MM/DD/YYYY";

/**
 * Format a date according to the user's dateFormat preference.
 * @param {Date|string|number} date
 * @param {string} dateFormat - one of DATE_FORMATS
 * @returns {string} formatted date, or "" if the date is invalid
 */
export const formatDateWithPreference = (
  date,
  dateFormat = DEFAULT_DATE_FORMAT,
) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  switch (dateFormat) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "MM/DD/YYYY":
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
};
