import path from "path";

export const validatePath = (filePath) => {
  if (!filePath) throw new Error("Path is required");
  const resolved = path.resolve(filePath);
  const uploadsDir = path.resolve("uploads");
  if (!resolved.startsWith(uploadsDir)) {
    throw new Error("Directory traversal detected: Access denied");
  }
  return resolved;
};

/**
 * Sanitizes a filename for safe use in Content-Disposition headers.
 * Prevents header injection by removing or escaping unsafe characters.
 *
 * Removes:
 * - Carriage returns (\r) and line feeds (\n)
 * - Control characters (0x00-0x1F, 0x7F)
 * - Quotes (both single and double)
 * - Backslashes
 *
 * Preserves valid filename characters while ensuring RFC-compliant headers.
 *
 * @param {string} filename - The filename to sanitize
 * @returns {string} The sanitized filename safe for use in Content-Disposition headers
 */
export const sanitizeFilenameForHeader = (filename) => {
  if (!filename) return "";
  
  return filename
    // Remove carriage returns and line feeds (prevents header injection)
    .replace(/[\r\n]/g, "")
    // Remove control characters (0x00-0x1F and 0x7F)
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Remove quotes (both single and double)
    .replace(/["']/g, "")
    // Remove backslashes
    .replace(/\\/g, "");
};
