/**
 * Parse participant CSV for schedule-create import (Issue #2056).
 * Distinct from org Team Members invitation CSV.
 *
 * Expected headers: email, name (required); role (optional).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const splitCsvLine = (line) => {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
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

export const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();

export const isValidParticipantEmail = (email) =>
  EMAIL_RE.test(String(email || "").trim());

/**
 * @param {string} input
 * @param {string[]} [existingEmails]
 * @returns {{
 *   valid: Array<{ name: string, email: string, role: string }>,
 *   invalid: Array<{ row: number, email: string, reason: string }>,
 *   skippedDuplicates: number
 * }}
 */
export const parseParticipantCsv = (input, existingEmails = []) => {
  if (input == null || String(input).trim() === "") {
    throw new Error("CSV content is required.");
  }

  let text = String(input).replace(/^\uFEFF/, "");
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headerFields = splitCsvLine(lines[0]).map(normalizeHeader);
  const emailIdx = headerFields.indexOf("email");
  const nameIdx = headerFields.indexOf("name");
  const roleIdx = headerFields.indexOf("role");

  if (emailIdx === -1 || nameIdx === -1) {
    throw new Error("CSV must include 'email' and 'name' headers.");
  }

  const seen = new Set(
    existingEmails
      .map((e) =>
        String(e || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  const valid = [];
  const invalid = [];
  let skippedDuplicates = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const rowNum = i + 1;
    let fields;
    try {
      fields = splitCsvLine(lines[i]);
    } catch (err) {
      invalid.push({
        row: rowNum,
        email: "",
        reason: err.message || "Malformed row.",
      });
      continue;
    }

    const email = String(fields[emailIdx] ?? "").trim();
    const name = String(fields[nameIdx] ?? "").trim();
    const role = roleIdx >= 0 ? String(fields[roleIdx] ?? "").trim() : "";

    if (!email && !name) {
      continue;
    }
    if (!name) {
      invalid.push({ row: rowNum, email, reason: "Name is required." });
      continue;
    }
    if (!email) {
      invalid.push({ row: rowNum, email: "", reason: "Email is required." });
      continue;
    }
    if (!isValidParticipantEmail(email)) {
      invalid.push({ row: rowNum, email, reason: "Invalid email address." });
      continue;
    }

    const key = email.toLowerCase();
    if (seen.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(key);
    valid.push({ name, email, role });
  }

  return { valid, invalid, skippedDuplicates };
};
