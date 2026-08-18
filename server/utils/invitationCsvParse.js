/**
 * Minimal CSV parser for invitation bulk import (Issue #1362).
 *
 * Intentionally dependency-free: the project exports CSV with `json2csv` but
 * does not ship a CSV reader. This parser covers the subset we need — headers,
 * quoted fields, commas inside quotes, BOM, and blank lines — and throws
 * ValidationError-friendly messages instead of crashing on malformed input.
 */

/**
 * Split a single CSV line into fields, honouring double-quoted values.
 * @param {string} line
 * @returns {string[]}
 */
export const splitCsvLine = (line) => {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote ("")
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      fields.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unmatched quote.");
  }

  fields.push(current);
  return fields;
};

/**
 * Normalize a header cell for comparison.
 * @param {string} value
 * @returns {string}
 */
export const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();

/**
 * Parse invitation CSV text into row objects.
 *
 * Required headers: `email`, `role`
 * Optional header: `message`
 *
 * Empty lines are ignored. Values are trimmed.
 *
 * @param {string|Buffer} input
 * @returns {{ headers: string[], rows: Array<{ row: number, email: string, role: string, message: string }> }}
 */
export const parseInvitationCsv = (input) => {
  if (input == null) {
    throw new Error("CSV content is required.");
  }

  let text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  text = text.replace(/^\uFEFF/, "");

  // Normalise newlines, then drop trailing empty line from final newline.
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines = rawLines
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  let headerFields;
  try {
    headerFields = splitCsvLine(lines[0]).map(normalizeHeader);
  } catch (err) {
    throw new Error(err.message || "Malformed CSV header.");
  }

  const emailIdx = headerFields.indexOf("email");
  const roleIdx = headerFields.indexOf("role");
  const messageIdx = headerFields.indexOf("message");

  if (emailIdx === -1 || roleIdx === -1) {
    throw new Error("CSV must include 'email' and 'role' headers.");
  }

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    let fields;
    try {
      fields = splitCsvLine(lines[i]);
    } catch (err) {
      throw new Error(
        `Malformed CSV at line ${i + 1}: ${err.message || "parse error"}`,
      );
    }

    const email = String(fields[emailIdx] ?? "").trim();
    const role = String(fields[roleIdx] ?? "").trim();
    const message =
      messageIdx >= 0 ? String(fields[messageIdx] ?? "").trim() : "";

    // Skip completely empty data rows (defensive; blanks already filtered).
    if (!email && !role && !message) continue;

    rows.push({
      // 1-based spreadsheet row number (header is row 1)
      row: i + 1,
      email,
      role,
      message,
    });
  }

  return { headers: headerFields, rows };
};

export default {
  splitCsvLine,
  normalizeHeader,
  parseInvitationCsv,
};
