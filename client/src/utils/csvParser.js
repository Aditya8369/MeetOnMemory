/**
 * CSV parsing and validation utilities for bulk invitation imports (#2019).
 */

/**
 * Split a single CSV line into fields, honoring double-quoted values and escaped quotes.
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
 * Parse raw CSV text into headers and row objects.
 * @param {string} csvText
 * @returns {{ headers: string[], rows: Array<Record<string, string>>, rawRows: string[][] }}
 */
export const parseCsv = (csvText) => {
  if (!csvText || typeof csvText !== "string") {
    throw new Error("CSV content is required.");
  }

  const cleanText = csvText.replace(/^\uFEFF/, "");
  const rawLines = cleanText.split(/\r\n|\n|\r/);
  const lines = rawLines
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new Error("CSV headers are missing or invalid.");
  }

  const rows = [];
  const rawRows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const fields = splitCsvLine(lines[i]).map((f) => f.trim());
    // Skip empty lines
    if (fields.length === 0 || fields.every((f) => !f)) continue;

    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = fields[idx] !== undefined ? fields[idx] : "";
    });

    rows.push(rowObj);
    rawRows.push(fields);
  }

  return { headers, rows, rawRows };
};

/**
 * Detect column mappings based on common header names.
 * @param {string[]} headers
 * @returns {{ email: string, role: string, message: string }}
 */
export const detectColumnMapping = (headers = []) => {
  const mapping = {
    email: "",
    role: "",
    message: "",
  };

  const emailPatterns = [
    /^email$/i,
    /^e-mail$/i,
    /^email[_\s]?address$/i,
    /^user[_\s]?email$/i,
    /^mail$/i,
    /^invitee[_\s]?email$/i,
  ];

  const rolePatterns = [
    /^role$/i,
    /^user[_\s]?role$/i,
    /^role[_\s]?type$/i,
    /^access$/i,
    /^permission$/i,
  ];

  const messagePatterns = [
    /^message$/i,
    /^personal[_\s]?message$/i,
    /^invite[_\s]?message$/i,
    /^invitation[_\s]?message$/i,
    /^note$/i,
    /^notes$/i,
    /^name$/i,
  ];

  headers.forEach((header) => {
    const trimmed = header.trim();
    if (!mapping.email && emailPatterns.some((p) => p.test(trimmed))) {
      mapping.email = header;
    } else if (!mapping.role && rolePatterns.some((p) => p.test(trimmed))) {
      mapping.role = header;
    } else if (
      !mapping.message &&
      messagePatterns.some((p) => p.test(trimmed))
    ) {
      mapping.message = header;
    }
  });

  // Fallback: if no exact match for email, check if any header includes 'email' or 'mail'
  if (!mapping.email) {
    const fallbackEmail = headers.find((h) => /mail/i.test(h));
    if (fallbackEmail) mapping.email = fallbackEmail;
  }

  return mapping;
};

/**
 * Validate email format safely without ReDoS.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const sanitized = email.trim().toLowerCase();
  if (sanitized.length > 254) return false;
  if (!sanitized.includes("@") || !sanitized.includes(".")) return false;
  const parts = sanitized.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (local.length > 64 || domain.length > 255) return false;
  if (domain.split(".").length < 2) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(sanitized);
};

export const ALLOWED_ROLES = ["member", "admin", "viewer"];

/**
 * Validate mapped CSV rows.
 * @param {Array<Record<string, string>>} rows
 * @param {{ email: string, role: string, message: string }} mapping
 * @param {string} defaultRole
 * @returns {{
 *   validatedRows: Array<{
 *     rowNumber: number,
 *     email: string,
 *     role: string,
 *     message: string,
 *     isValid: boolean,
 *     errors: string[],
 *     isDuplicate: boolean
 *   }>,
 *   total: number,
 *   validCount: number,
 *   invalidCount: number,
 *   duplicateCount: number
 * }}
 */
export const validateMappedRows = (
  rows = [],
  mapping = {},
  defaultRole = "member",
) => {
  const seenEmails = new Map(); // email -> count
  const validatedRows = [];

  // First pass: count email occurrences for duplicate detection
  rows.forEach((row) => {
    const rawEmail = (row[mapping.email] || "").trim().toLowerCase();
    if (rawEmail && isValidEmail(rawEmail)) {
      seenEmails.set(rawEmail, (seenEmails.get(rawEmail) || 0) + 1);
    }
  });

  const emailOccurrencesTracked = new Map();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // Row 1 is header, 1-based indexing
    const rawEmail = (row[mapping.email] || "").trim();
    const rawRole = (
      (mapping.role ? row[mapping.role] : "") ||
      defaultRole ||
      "member"
    )
      .trim()
      .toLowerCase();
    const rawMessage = (mapping.message ? row[mapping.message] : "").trim();

    const errors = [];
    let isDuplicate = false;

    if (!rawEmail) {
      errors.push("Email is required");
    } else if (!isValidEmail(rawEmail)) {
      errors.push("Invalid email address format");
    } else {
      const lower = rawEmail.toLowerCase();
      const count = seenEmails.get(lower) || 0;
      const seenSoFar = emailOccurrencesTracked.get(lower) || 0;
      emailOccurrencesTracked.set(lower, seenSoFar + 1);

      if (count > 1 && seenSoFar > 0) {
        isDuplicate = true;
        errors.push("Duplicate email in this CSV file");
      }
    }

    if (!rawRole) {
      errors.push("Role is required");
    } else if (!ALLOWED_ROLES.includes(rawRole)) {
      errors.push(
        `Invalid role '${rawRole}'. Must be 'member', 'admin', or 'viewer'`,
      );
    }

    const isValid = errors.length === 0;

    validatedRows.push({
      rowNumber,
      email: rawEmail,
      role: ALLOWED_ROLES.includes(rawRole) ? rawRole : defaultRole || "member",
      message: rawMessage.substring(0, 500),
      isValid,
      errors,
      isDuplicate,
    });
  });

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.length - validCount;
  const duplicateCount = validatedRows.filter((r) => r.isDuplicate).length;

  return {
    validatedRows,
    total: validatedRows.length,
    validCount,
    invalidCount,
    duplicateCount,
  };
};

/**
 * Build clean standard CSV content for valid invitation rows.
 * @param {Array<{ email: string, role: string, message?: string }>} rows
 * @returns {string}
 */
export const buildStandardCsv = (rows = []) => {
  const header = "email,role,message";
  const lines = rows.map((r) => {
    const email = (r.email || "").trim();
    const role = (r.role || "member").trim().toLowerCase();
    const message = (r.message || "").trim();

    const escapedMessage = message.includes(",") || message.includes('"') || message.includes("\n")
      ? `"${message.replace(/"/g, '""')}"`
      : message;

    return `${email},${role},${escapedMessage}`;
  });

  return [header, ...lines].join("\n");
};

/**
 * Generate a sample CSV string for users to download as a template.
 * @returns {string}
 */
export const generateSampleCsv = () => {
  return [
    "email,role,message",
    "alex.smith@example.com,member,Welcome to the team!",
    "sarah.jones@example.com,admin,Joining as workspace administrator",
    "developer@example.com,member,",
  ].join("\n");
};
