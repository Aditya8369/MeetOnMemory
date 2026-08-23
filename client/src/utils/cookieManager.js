/**
 * Cookie Management & Tracking Preferences Utility
 *
 * Provides utilities to set, get, delete browser cookies,
 * persist user cookie consent preferences, and apply them (e.g. enabling or disabling tracking/analytics).
 */

export const COOKIE_PREFERENCES_KEY = "mom_cookie_preferences";

export const DEFAULT_PREFERENCES = {
  essential: true,
  functional: true,
  analytics: false,
  targeting: false,
  aiContext: false,
};

/**
 * Get stored cookie preferences from localStorage, falling back to defaults.
 */
export const getCookiePreferences = () => {
  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed, essential: true };
    }
  } catch (e) {
    console.error("Error reading cookie preferences:", e);
  }
  return { ...DEFAULT_PREFERENCES };
};

/**
 * Set a cookie in document.cookie with given options.
 */
export const setCookie = (name, value, days = 365, path = "/") => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=${path}; SameSite=Lax`;
};

/**
 * Get a specific cookie value by name.
 */
export const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(^|;\\s*)(${encodeURIComponent(name)})=([^;]*)`),
  );
  return match ? decodeURIComponent(match[3]) : null;
};

/**
 * Delete a specific cookie across common paths and domain variants.
 */
export const deleteCookie = (name, path = "/") => {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  // Also try deleting on root path
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  // Also attempt host domain clearing
  const hostname = window.location.hostname;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${hostname}`;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${hostname}`;
};

/**
 * Clear all non-essential cookies and localStorage entries.
 */
export const clearNonEssentialCookies = () => {
  if (typeof document === "undefined") return;

  const nonEssentialCookies = [
    "_ga",
    "_gid",
    "_gat",
    "_gat_gtag",
    "mom_analytics",
    "mom_targeting",
    "mom_context",
    "mom_tour_seen",
  ];

  // Clear recognized non-essential cookies
  nonEssentialCookies.forEach((name) => deleteCookie(name));

  // Parse any remaining cookies and delete non-auth/essential cookies
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    if (
      name &&
      !name.startsWith("__clerk") &&
      !name.startsWith("__session") &&
      !name.startsWith("__client") &&
      name !== "token"
    ) {
      deleteCookie(name);
    }
  }

  // Clear non-essential functional items in localStorage if requested
  const nonEssentialStorage = [
    "mom_recent_searches",
    "mom_tour_step",
    "mom_analytics_session",
  ];
  nonEssentialStorage.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors
    }
  });
};

/**
 * Apply cookie preferences by writing preference cookies/localStorage and
 * configuring Google Analytics / tracking scripts accordingly.
 */
export const applyCookiePreferences = (prefs) => {
  if (!prefs) return;
  const effectivePrefs = { ...prefs, essential: true };

  try {
    localStorage.setItem(
      COOKIE_PREFERENCES_KEY,
      JSON.stringify(effectivePrefs),
    );
  } catch (e) {
    console.error("Error saving cookie preferences:", e);
  }

  // Set real cookie indicators
  setCookie("mom_consent_essential", "true", 365);
  setCookie(
    "mom_consent_functional",
    effectivePrefs.functional ? "true" : "false",
    365,
  );
  setCookie(
    "mom_consent_analytics",
    effectivePrefs.analytics ? "true" : "false",
    365,
  );
  setCookie(
    "mom_consent_targeting",
    effectivePrefs.targeting ? "true" : "false",
    365,
  );
  setCookie(
    "mom_consent_aiContext",
    effectivePrefs.aiContext ? "true" : "false",
    365,
  );

  // If analytics or targeting is disabled, purge relevant tracking cookies immediately
  if (!effectivePrefs.analytics) {
    deleteCookie("_ga");
    deleteCookie("_gid");
    deleteCookie("_gat");
    deleteCookie("mom_analytics");
    if (
      typeof window !== "undefined" &&
      window["ga-disable-GA_MEASUREMENT_ID"] !== undefined
    ) {
      window["ga-disable-GA_MEASUREMENT_ID"] = true;
    }
  }

  if (!effectivePrefs.targeting) {
    deleteCookie("mom_targeting");
  }

  // Dispatch an event so components/trackers can react dynamically
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mom_cookie_preferences_updated", {
        detail: effectivePrefs,
      }),
    );
  }
};
